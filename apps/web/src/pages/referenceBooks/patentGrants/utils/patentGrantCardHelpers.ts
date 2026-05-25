import type { PatentGrant } from '../../../../types/patent';

export function getPartnerDisplayLabel(
  partner?: { short_name?: string | null; name?: string | null } | null,
): string {
  if (!partner) return '';
  const fullName = String(partner.name ?? '').trim();
  const shortName = String(partner.short_name ?? '').trim();
  return fullName || shortName;
}

export function hasActualLicensee(partnerId?: string | null): boolean {
  return Boolean(partnerId?.trim());
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
