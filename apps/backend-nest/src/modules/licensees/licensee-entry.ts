import { BadRequestException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import {
  partners,
  relPatentGrantActualLicensees,
  relPatentGrantExpectedLicensees,
  relPatentsExpectedLicensees,
} from '../../database/schema';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LicenseeEntryDto = {
  partner_id?: string;
  name: string;
  inn?: string;
};

export function toPartnerUuid(value: unknown): string | null {
  if (value == null || value === '') return null;
  const normalized = String(value).trim();
  return UUID_RE.test(normalized) ? normalized : null;
}

const LICENSEE_INN_ONLY_MESSAGE =
  'Нельзя указать только ИНН - укажите название или выберите контрагента из справочника';

function assertNoInnOnlyLicenseeRows(raw: unknown[], fieldLabel: string): void {
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const partnerId = toPartnerUuid(row.partner_id);
    const name = String(row.name ?? '').trim();
    const inn = String(row.inn ?? '').trim();
    if (inn && !name && !partnerId) {
      throw new BadRequestException(`${fieldLabel}: ${LICENSEE_INN_ONLY_MESSAGE}`);
    }
  }
}

function normalizeEntry(raw: unknown): LicenseeEntryDto | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const partnerId = toPartnerUuid(row.partner_id);
  const name = String(row.name ?? '').trim();
  const inn = String(row.inn ?? '').trim();
  if (!name && !partnerId) return null;
  return {
    ...(partnerId ? { partner_id: partnerId } : {}),
    name,
    ...(inn ? { inn } : {}),
  };
}

function dedupeEntries(entries: LicenseeEntryDto[]): LicenseeEntryDto[] {
  const seen = new Set<string>();
  const result: LicenseeEntryDto[] = [];
  for (const entry of entries) {
    const key = `${entry.partner_id ?? ''}|${entry.name.toLowerCase()}|${entry.inn ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export function parseLicenseeEntries(
  data: Record<string, unknown>,
  entriesKey: string,
  legacyIdsKey?: string,
  legacyIdKey?: string,
): LicenseeEntryDto[] | undefined {
  if (Object.prototype.hasOwnProperty.call(data, entriesKey)) {
    const raw = data[entriesKey];
    if (!Array.isArray(raw)) return [];
    const fieldLabel =
      entriesKey === 'actual_licensees' ? 'Фактический лицензиат' : 'Предполагаемый лицензиат';
    assertNoInnOnlyLicenseeRows(raw, fieldLabel);
    return dedupeEntries(raw.map(normalizeEntry).filter((entry): entry is LicenseeEntryDto => Boolean(entry)));
  }

  if (legacyIdsKey && Object.prototype.hasOwnProperty.call(data, legacyIdsKey)) {
    const raw = data[legacyIdsKey];
    if (!Array.isArray(raw)) return [];
    return dedupeEntries(
      raw
        .map(toPartnerUuid)
        .filter((id): id is string => Boolean(id))
        .map(partner_id => ({ partner_id, name: '', inn: '' })),
    );
  }

  if (legacyIdKey && Object.prototype.hasOwnProperty.call(data, legacyIdKey)) {
    const one = toPartnerUuid(data[legacyIdKey]);
    return one ? [{ partner_id: one, name: '', inn: '' }] : [];
  }

  return undefined;
}

export function parseExpectedLicenseeEntries(data: Record<string, unknown>): LicenseeEntryDto[] | undefined {
  return parseLicenseeEntries(
    data,
    'expected_licensees',
    'expected_licensee_partner_ids',
    'expected_licensee_partner_id',
  );
}

export function parseActualLicenseeEntries(data: Record<string, unknown>): LicenseeEntryDto[] | undefined {
  return parseLicenseeEntries(data, 'actual_licensees', 'actual_licensee_partner_ids', 'actual_licensee_partner_id');
}

export function hasLicenseeEntries(entries: LicenseeEntryDto[] | undefined | null): boolean {
  return Boolean(entries?.some(entry => entry.name.trim() || entry.partner_id));
}

function rowToEntry(row: {
  partnerId: string | null;
  name: string | null;
  inn: string | null;
}): LicenseeEntryDto | null {
  const partnerId = row.partnerId ? String(row.partnerId) : undefined;
  const name = String(row.name ?? '').trim();
  const inn = String(row.inn ?? '').trim();
  if (!name && !partnerId) return null;
  return {
    ...(partnerId ? { partner_id: partnerId } : {}),
    name: name || 'Контрагент',
    ...(inn ? { inn } : {}),
  };
}

async function enrichEntriesFromPartners(
  db: DatabaseService,
  entries: LicenseeEntryDto[],
): Promise<LicenseeEntryDto[]> {
  const partnerIds = [
    ...new Set(entries.map(entry => entry.partner_id).filter((id): id is string => Boolean(id))),
  ];
  if (partnerIds.length === 0) {
    return entries.map(entry => ({
      ...entry,
      name: entry.name.trim() || 'Контрагент',
    }));
  }

  const partnerRows = await db.db
    .select({ id: partners.id, name: partners.name, shortName: partners.shortName, inn: partners.inn })
    .from(partners)
    .where(inArray(partners.id, partnerIds));
  const byId = new Map(partnerRows.map(row => [String(row.id), row]));

  return entries.map(entry => {
    if (entry.name.trim()) {
      return { ...entry, name: entry.name.trim(), inn: entry.inn?.trim() || undefined };
    }
    const partner = entry.partner_id ? byId.get(entry.partner_id) : undefined;
    const name =
      String(partner?.shortName ?? '').trim() ||
      String(partner?.name ?? '').trim() ||
      entry.name.trim() ||
      'Контрагент';
    const inn = entry.inn?.trim() || String(partner?.inn ?? '').trim() || undefined;
    return {
      ...(entry.partner_id ? { partner_id: entry.partner_id } : {}),
      name,
      ...(inn ? { inn } : {}),
    };
  });
}

async function syncEntriesForParent(
  db: DatabaseService,
  table: typeof relPatentsExpectedLicensees | typeof relPatentGrantExpectedLicensees | typeof relPatentGrantActualLicensees,
  parentColumn:
    | typeof relPatentsExpectedLicensees.patentId
    | typeof relPatentGrantExpectedLicensees.patentGrantId
    | typeof relPatentGrantActualLicensees.patentGrantId,
  parentId: string,
  entries: LicenseeEntryDto[],
): Promise<void> {
  await db.db.delete(table).where(eq(parentColumn, parentId));
  const enriched = await enrichEntriesFromPartners(db, dedupeEntries(entries));
  const valid = enriched.filter(entry => entry.name.trim() || entry.partner_id);
  if (valid.length === 0) return;

  await db.db.insert(table).values(
    valid.map(entry => ({
      ...(table === relPatentsExpectedLicensees
        ? { patentId: parentId }
        : { patentGrantId: parentId }),
      partnerId: entry.partner_id ?? null,
      name: entry.name.trim() || 'Контрагент',
      inn: entry.inn?.trim() || null,
    })),
  );
}

async function loadEntriesByParentIds(
  db: DatabaseService,
  table: typeof relPatentsExpectedLicensees | typeof relPatentGrantExpectedLicensees | typeof relPatentGrantActualLicensees,
  parentColumn:
    | typeof relPatentsExpectedLicensees.patentId
    | typeof relPatentGrantExpectedLicensees.patentGrantId
    | typeof relPatentGrantActualLicensees.patentGrantId,
  parentIds: string[],
): Promise<Map<string, LicenseeEntryDto[]>> {
  const result = new Map<string, LicenseeEntryDto[]>();
  if (parentIds.length === 0) return result;

  const rows = await db.db
    .select({
      parentId: parentColumn,
      partnerId: table.partnerId,
      name: table.name,
      inn: table.inn,
    })
    .from(table)
    .where(inArray(parentColumn, parentIds));

  for (const row of rows) {
    const parentId = row.parentId ? String(row.parentId) : '';
    if (!parentId) continue;
    const entry = rowToEntry(row);
    if (!entry) continue;
    const list = result.get(parentId) ?? [];
    list.push(entry);
    result.set(parentId, list);
  }

  return result;
}

export async function loadExpectedLicenseesByPatentIds(
  db: DatabaseService,
  patentIds: string[],
): Promise<Map<string, LicenseeEntryDto[]>> {
  return loadEntriesByParentIds(db, relPatentsExpectedLicensees, relPatentsExpectedLicensees.patentId, patentIds);
}

export async function syncExpectedLicenseesForPatent(
  db: DatabaseService,
  patentId: string,
  entries: LicenseeEntryDto[],
): Promise<void> {
  await syncEntriesForParent(db, relPatentsExpectedLicensees, relPatentsExpectedLicensees.patentId, patentId, entries);
}

export async function loadExpectedLicenseesByGrantIds(
  db: DatabaseService,
  grantIds: string[],
): Promise<Map<string, LicenseeEntryDto[]>> {
  return loadEntriesByParentIds(
    db,
    relPatentGrantExpectedLicensees,
    relPatentGrantExpectedLicensees.patentGrantId,
    grantIds,
  );
}

export async function syncExpectedLicenseesForGrant(
  db: DatabaseService,
  grantId: string,
  entries: LicenseeEntryDto[],
): Promise<void> {
  await syncEntriesForParent(
    db,
    relPatentGrantExpectedLicensees,
    relPatentGrantExpectedLicensees.patentGrantId,
    grantId,
    entries,
  );
}

export async function loadActualLicenseesByGrantIds(
  db: DatabaseService,
  grantIds: string[],
): Promise<Map<string, LicenseeEntryDto[]>> {
  return loadEntriesByParentIds(
    db,
    relPatentGrantActualLicensees,
    relPatentGrantActualLicensees.patentGrantId,
    grantIds,
  );
}

export async function syncActualLicenseesForGrant(
  db: DatabaseService,
  grantId: string,
  entries: LicenseeEntryDto[],
): Promise<void> {
  await syncEntriesForParent(
    db,
    relPatentGrantActualLicensees,
    relPatentGrantActualLicensees.patentGrantId,
    grantId,
    entries,
  );
}

export async function deleteExpectedLicenseesForGrant(db: DatabaseService, grantId: string): Promise<void> {
  await db.db.delete(relPatentGrantExpectedLicensees).where(eq(relPatentGrantExpectedLicensees.patentGrantId, grantId));
}

export async function deleteActualLicenseesForGrant(db: DatabaseService, grantId: string): Promise<void> {
  await db.db.delete(relPatentGrantActualLicensees).where(eq(relPatentGrantActualLicensees.patentGrantId, grantId));
}
