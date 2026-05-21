import { eq, inArray } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import { relPatentGrantExpectedLicensees } from '../../database/schema';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toPartnerUuid(value: unknown): string | null {
  if (value == null || value === '') return null;
  const normalized = String(value).trim();
  return UUID_RE.test(normalized) ? normalized : null;
}

export function parseExpectedLicenseePartnerIds(data: Record<string, unknown>): string[] | undefined {
  if (Object.prototype.hasOwnProperty.call(data, 'expected_licensee_partner_ids')) {
    const raw = data.expected_licensee_partner_ids;
    if (!Array.isArray(raw)) return [];
    const ids = raw.map(toPartnerUuid).filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }

  if (Object.prototype.hasOwnProperty.call(data, 'expected_licensee_partner_id')) {
    const one = toPartnerUuid(data.expected_licensee_partner_id);
    return one ? [one] : [];
  }

  return undefined;
}

export function parseActualLicenseePartnerId(data: Record<string, unknown>): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(data, 'actual_licensee_partner_id')) {
    return undefined;
  }
  return toPartnerUuid(data.actual_licensee_partner_id);
}

export async function loadExpectedLicenseePartnerIdsByGrantIds(
  db: DatabaseService,
  grantIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (grantIds.length === 0) return result;

  const rows = await db.db
    .select({
      grantId: relPatentGrantExpectedLicensees.patentGrantId,
      partnerId: relPatentGrantExpectedLicensees.partnerId,
    })
    .from(relPatentGrantExpectedLicensees)
    .where(inArray(relPatentGrantExpectedLicensees.patentGrantId, grantIds));

  for (const row of rows) {
    const grantId = row.grantId ? String(row.grantId) : '';
    const partnerId = row.partnerId ? String(row.partnerId) : '';
    if (!grantId || !partnerId) continue;
    const list = result.get(grantId) ?? [];
    if (!list.includes(partnerId)) list.push(partnerId);
    result.set(grantId, list);
  }

  return result;
}

export async function syncExpectedLicenseePartners(
  db: DatabaseService,
  grantId: string,
  partnerIds: string[],
): Promise<void> {
  await db.db
    .delete(relPatentGrantExpectedLicensees)
    .where(eq(relPatentGrantExpectedLicensees.patentGrantId, grantId));

  const uniqueIds = [...new Set(partnerIds)];
  if (uniqueIds.length === 0) return;

  await db.db.insert(relPatentGrantExpectedLicensees).values(
    uniqueIds.map(partnerId => ({
      patentGrantId: grantId,
      partnerId,
    })),
  );
}

export async function deleteExpectedLicenseePartnersForGrant(db: DatabaseService, grantId: string): Promise<void> {
  await db.db
    .delete(relPatentGrantExpectedLicensees)
    .where(eq(relPatentGrantExpectedLicensees.patentGrantId, grantId));
}
