import type { PatentGrant } from '../../../../types/patent';

export function formatPatentGrantIssueDateRu(dateStr?: string): string {
  if (!dateStr?.trim()) {
    return '';
  }
  return `Выдан: ${new Date(dateStr).toLocaleDateString('ru-RU')}`;
}

export function buildPatentGrantRidDescription(grant: PatentGrant): string | undefined {
  const reg = grant.patent_registration_number?.trim();
  const name = grant.patent_name?.trim();
  if (!reg && !name) {
    return undefined;
  }
  const regPart = reg ? `№ ${reg}` : '';
  const namePart = name ? name : '';
  if (regPart && namePart) {
    return `РИД: ${regPart} · ${namePart}`;
  }
  return `РИД: ${regPart || namePart}`;
}

export function buildPatentGrantRidSelectLabel(
  grant: Pick<PatentGrant, 'patent_name' | 'patent_registration_number'>,
): string {
  const reg = grant.patent_registration_number?.trim();
  const name = grant.patent_name?.trim();
  if (reg && name) return `${reg} — ${name}`;
  if (reg) return reg;
  if (name) return name;
  return 'РИД';
}
