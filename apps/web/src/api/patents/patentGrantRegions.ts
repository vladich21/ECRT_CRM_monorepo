export const PATENT_GRANT_REGION_KEYS = ['eurasia', 'russia', 'cis_union'] as const;

export type PatentGrantRegionKey = (typeof PATENT_GRANT_REGION_KEYS)[number];

const ALLOWED = new Set<string>(PATENT_GRANT_REGION_KEYS);

export function isPatentGrantRegionKey(value: unknown): value is PatentGrantRegionKey {
  return typeof value === 'string' && ALLOWED.has(value);
}

export const PATENT_GRANT_REGION_OPTIONS: { label: string; value: PatentGrantRegionKey }[] = [
  { value: 'eurasia', label: 'Евразия (ЕАПО)' },
  { value: 'russia', label: 'Россия (РФ, ФИПС)' },
  {
    value: 'cis_union',
    label: 'РФ и страны (Россия, Азербайджан, Армения, Беларусь, Казахстан, Кыргызстан, Таджикистан, Туркменистан)',
  },
];

export const PATENT_GRANT_OFFICE_OPTIONS: { label: string; value: string }[] = [
  { value: 'ЕАПО (Евразия)', label: 'ЕАПО (Евразия)' },
  { value: 'ФИПС (Россия)', label: 'ФИПС / Роспатент (Россия)' },
  {
    value: 'РФ и страны (Россия, Азербайджан, Армения, Беларусь, Казахстан, Кыргызстан, Таджикистан, Туркменистан)',
    label: 'РФ и страны (Россия, Азербайджан, Армения, Беларусь, Казахстан, Кыргызстан, Таджикистан, Туркменистан)',
  },
];
