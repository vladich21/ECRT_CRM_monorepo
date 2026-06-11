import type { LicenseeEntry } from '@/types/licenseeEntry';

export const EMPTY_LICENSEE_FORM_ENTRY: LicenseeEntry = { name: '', inn: '' };

/** Одна пустая строка в форме, если записей ещё нет. */
export function defaultLicenseeFormRows(entries?: LicenseeEntry[] | null): LicenseeEntry[] {
  return entries?.length ? entries : [{ ...EMPTY_LICENSEE_FORM_ENTRY }];
}

export function normalizeLicenseeEntriesForPayload(raw: unknown): LicenseeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(entry => normalizeLicenseeEntry(entry as Partial<LicenseeEntry>))
    .filter((entry): entry is LicenseeEntry => Boolean(entry));
}

export function normalizeLicenseeEntry(raw: Partial<LicenseeEntry> | null | undefined): LicenseeEntry | null {
  if (!raw) return null;
  const partnerId = raw.partner_id?.trim() || undefined;
  const name = String(raw.name ?? '').trim();
  const inn = String(raw.inn ?? '').trim() || undefined;
  if (!name && !partnerId) return null;
  return {
    ...(partnerId ? { partner_id: partnerId } : {}),
    name,
    ...(inn ? { inn } : {}),
  };
}

export function getPatentExpectedLicensees(
  patent?: { expected_licensees?: LicenseeEntry[] } | null,
): LicenseeEntry[] {
  if (!patent?.expected_licensees?.length) return [];
  return patent.expected_licensees
    .map(entry => normalizeLicenseeEntry(entry))
    .filter((entry): entry is LicenseeEntry => Boolean(entry));
}

export function getPatentGrantActualLicensees(
  grant?: { actual_licensees?: LicenseeEntry[] } | null,
): LicenseeEntry[] {
  if (!grant?.actual_licensees?.length) return [];
  return grant.actual_licensees
    .map(entry => normalizeLicenseeEntry(entry))
    .filter((entry): entry is LicenseeEntry => Boolean(entry));
}

export function hasLicenseeEntries(entries?: LicenseeEntry[] | null): boolean {
  return Boolean(entries?.some(entry => entry.name.trim() || entry.partner_id));
}

export function hasActualLicensee(entries?: LicenseeEntry[] | null): boolean {
  return hasLicenseeEntries(entries);
}

export function formatLicenseeEntryLabel(entry: LicenseeEntry): string {
  const name = entry.name.trim();
  const inn = entry.inn?.trim();
  if (name && inn) return `${name} (ИНН ${inn})`;
  return name || (inn ? `ИНН ${inn}` : '');
}

export function formatLicenseeEntriesExport(entries: LicenseeEntry[]): string {
  return entries.map(formatLicenseeEntryLabel).filter(Boolean).join('; ');
}
