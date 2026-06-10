import type { PatentGrant } from '../../../../types/patent';

export function getPartnerDisplayLabel(
  partner?: { short_name?: string | null; name?: string | null } | null,
): string {
  if (!partner) return '';
  const fullName = String(partner.name ?? '').trim();
  const shortName = String(partner.short_name ?? '').trim();
  return fullName || shortName;
}

export function hasActualLicensee(partnerIds?: string[] | string | null): boolean {
  if (Array.isArray(partnerIds)) {
    return partnerIds.some(id => id.trim());
  }
  return Boolean(partnerIds?.trim());
}

export function getPatentGrantActualLicenseeIds(
  grant?: { actual_licensee_partner_ids?: string[]; actual_licensee_partner_id?: string | null } | null,
): string[] {
  if (!grant) return [];
  if (grant.actual_licensee_partner_ids?.length) {
    return grant.actual_licensee_partner_ids.filter(id => id.trim());
  }
  const legacyId = grant.actual_licensee_partner_id?.trim();
  return legacyId ? [legacyId] : [];
}

export function getPatentExpectedLicenseeIds(
  patent?: { expected_licensee_partner_ids?: string[]; expected_licensee_partner_id?: string | null } | null,
): string[] {
  if (!patent) return [];
  if (patent.expected_licensee_partner_ids?.length) {
    return patent.expected_licensee_partner_ids.filter(id => id.trim());
  }
  const legacyId = patent.expected_licensee_partner_id?.trim();
  return legacyId ? [legacyId] : [];
}

export function getContractDisplayLabel(contract?: { number?: string; name?: string } | null): string {
  if (!contract) return '';
  const number = 'number' in contract ? String(contract.number ?? '').trim() : '';
  return number || String(contract.name ?? '').trim();
}

export function formatPatentGrantIssueDateRu(dateStr?: string): string {
  if (!dateStr?.trim()) return '';
  return `Выдан: ${new Date(dateStr).toLocaleDateString('ru-RU')}`;
}

export function buildPatentGrantRidDescription(grant: PatentGrant): string | undefined {
  const reg = grant.patent_registration_number?.trim();
  const name = grant.patent_name?.trim();
  if (!reg && !name) return undefined;
  const regPart = reg ? `№ ${reg}` : '';
  const namePart = name ? name : '';
  if (regPart && namePart) return `РИД: ${regPart} · ${namePart}`;
  return `РИД: ${regPart || namePart}`;
}

export function buildPatentGrantRidSelectLabel(
  grant: Pick<PatentGrant, 'patent_name' | 'patent_registration_number'>,
): string {
  return buildPatentSelectLabel({
    registration_number: grant.patent_registration_number,
    name: grant.patent_name,
  });
}

export function buildPatentSelectLabel(patent: {
  registration_number?: string | null;
  name?: string | null;
}): string {
  const reg = patent.registration_number?.trim();
  const name = patent.name?.trim();
  if (reg && name) return `${reg} — ${name}`;
  if (reg) return reg;
  if (name) return name;
  return 'РИД';
}
