import type { PatentGrant } from '../../../../types/patent';

export function formatPatentGrantIssueDateRu(dateStr?: string): string {
  if (!dateStr?.trim()) {
    return '';
  }
  return `Выдан: ${new Date(dateStr).toLocaleDateString('ru-RU')}`;
}

/** Текст блока «РИД» на карточке (как в реестре). */
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
