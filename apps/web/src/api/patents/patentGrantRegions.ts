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
