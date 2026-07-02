import { asc, eq, inArray } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import { partnerContactPhones } from '../../database/schema';

export type PartnerContactPhoneDto = {
  phone: string;
  phone_ext?: string;
};

export function normalizeContactPhoneEntry(raw: unknown): PartnerContactPhoneDto | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const phone = String(row.phone ?? '').trim();
  const phoneExt = String(row.phone_ext ?? '').trim();
  if (!phone && !phoneExt) return null;
  return {
    phone,
    ...(phoneExt ? { phone_ext: phoneExt } : {}),
  };
}

export function parseContactPhonesFromBody(data: Record<string, unknown>): PartnerContactPhoneDto[] | undefined {
  if (Object.prototype.hasOwnProperty.call(data, 'phones')) {
    const raw = data.phones;
    if (!Array.isArray(raw)) return [];
    return raw
      .map(entry => normalizeContactPhoneEntry(entry))
      .filter((entry): entry is PartnerContactPhoneDto => Boolean(entry));
  }

  if (data.phone !== undefined || data.phone_ext !== undefined) {
    const entry = normalizeContactPhoneEntry({ phone: data.phone, phone_ext: data.phone_ext });
    return entry ? [entry] : [];
  }

  return undefined;
}

export function legacyPhoneFieldsFromPhones(phones: PartnerContactPhoneDto[]): {
  phone: string | null;
  phoneExt: string | null;
} {
  const first = phones[0];
  const phone = first?.phone?.trim() || null;
  const phoneExt = first?.phone_ext?.trim() || null;
  return { phone, phoneExt };
}

export function formatContactPhonesLabel(phones: PartnerContactPhoneDto[]): string {
  return phones
    .map(entry => {
      const phone = entry.phone.trim();
      const ext = entry.phone_ext?.trim();
      if (!phone && !ext) return '';
      if (phone && ext) return `${phone} доб. ${ext}`;
      return phone || `доб. ${ext}`;
    })
    .filter(Boolean)
    .join(', ');
}

export async function loadContactPhonesByContactIds(
  db: DatabaseService,
  contactIds: string[],
): Promise<Map<string, PartnerContactPhoneDto[]>> {
  const result = new Map<string, PartnerContactPhoneDto[]>();
  if (contactIds.length === 0) return result;

  const rows = await db.db
    .select({
      contactId: partnerContactPhones.contactId,
      phone: partnerContactPhones.phone,
      phoneExt: partnerContactPhones.phoneExt,
    })
    .from(partnerContactPhones)
    .where(inArray(partnerContactPhones.contactId, contactIds))
    .orderBy(asc(partnerContactPhones.sortOrder), asc(partnerContactPhones.createdAt));

  for (const row of rows) {
    if (!row.contactId) continue;
    const contactId = String(row.contactId);
    const entry = normalizeContactPhoneEntry({ phone: row.phone, phone_ext: row.phoneExt });
    if (!entry) continue;
    const list = result.get(contactId) ?? [];
    list.push(entry);
    result.set(contactId, list);
  }

  return result;
}

export async function syncContactPhonesForContact(
  db: DatabaseService,
  contactId: string,
  phones: PartnerContactPhoneDto[],
): Promise<void> {
  await db.db.delete(partnerContactPhones).where(eq(partnerContactPhones.contactId, contactId));
  if (phones.length === 0) return;

  await db.db.insert(partnerContactPhones).values(
    phones.map((entry, index) => ({
      contactId,
      phone: entry.phone.trim() || null,
      phoneExt: entry.phone_ext?.trim() || null,
      sortOrder: index,
    })),
  );
}
