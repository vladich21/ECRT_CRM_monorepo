import type { PartnerContactPhone } from '@/types/partner';

export type { PartnerContactPhone };

export const EMPTY_PARTNER_CONTACT_PHONE: PartnerContactPhone = { phone: '', phone_ext: '' };

/** Одна пустая строка телефона в форме, если номеров ещё нет. */
export function defaultContactPhoneFormRows(
  phones?: PartnerContactPhone[] | null,
  legacy?: { phone?: string; phone_ext?: string },
): PartnerContactPhone[] {
  if (phones?.length) {
    return phones.map(entry => ({
      phone: entry.phone ?? '',
      phone_ext: entry.phone_ext ?? '',
    }));
  }

  const phone = legacy?.phone?.trim() ?? '';
  const phoneExt = legacy?.phone_ext?.trim() ?? '';
  if (phone || phoneExt) {
    return [{ phone, phone_ext: phoneExt }];
  }

  return [{ ...EMPTY_PARTNER_CONTACT_PHONE }];
}

export function normalizeContactPhonesForPayload(raw: unknown): PartnerContactPhone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as PartnerContactPhone;
      const phone = String(row.phone ?? '').trim();
      const phoneExt = String(row.phone_ext ?? '').trim();
      if (!phone && !phoneExt) return null;
      return {
        phone,
        ...(phoneExt ? { phone_ext: phoneExt } : {}),
      };
    })
    .filter((entry): entry is PartnerContactPhone => Boolean(entry));
}

export function getContactPhonesForDisplay(
  contact: { phones?: PartnerContactPhone[]; phone?: string; phone_ext?: string },
): PartnerContactPhone[] {
  const normalized = normalizeContactPhonesForPayload(contact.phones);
  if (normalized.length > 0) return normalized;
  return defaultContactPhoneFormRows(null, contact).filter(
    entry => entry.phone.trim() || entry.phone_ext?.trim(),
  );
}

export function formatContactPhoneLabel(entry: PartnerContactPhone): string {
  const phone = entry.phone.trim();
  const phoneExt = entry.phone_ext?.trim();
  if (phone && phoneExt) return `${phone} доб. ${phoneExt}`;
  return phone || (phoneExt ? `доб. ${phoneExt}` : '');
}

export function buildContactFormPayload(values: Record<string, unknown>): Record<string, unknown> {
  const phones = normalizeContactPhonesForPayload(values.phones);
  const first = phones[0];
  return {
    ...values,
    phones,
    phone: first?.phone ?? '',
    phone_ext: first?.phone_ext ?? '',
  };
}

export function buildContactFormModalData(
  contact: {
    id?: string;
    full_name?: string;
    position?: string;
    email?: string;
    is_primary?: boolean;
    phones?: PartnerContactPhone[];
    phone?: string;
    phone_ext?: string;
  },
  options?: { hasPrimaryContact?: boolean },
) {
  const phones = defaultContactPhoneFormRows(contact.phones, contact);
  const first = phones[0] ?? EMPTY_PARTNER_CONTACT_PHONE;
  return {
    ...contact,
    phones,
    phone: first.phone,
    phone_ext: first.phone_ext ?? '',
    ...(options?.hasPrimaryContact != null ? { hasPrimaryContact: options.hasPrimaryContact } : {}),
  };
}
