import type { PatentGrantRegionKey } from './patentGrantRegions';

export type PatentGrantsRegistryServerFilters = {
  search: string;
  grantStatuses: string[];
  grantRegionKeys: PatentGrantRegionKey[];
  grantIssueYears: number[];
  grantRenewalYears: number[];
};

export type PatentGrantsRegistryAdvancedFilters = Omit<PatentGrantsRegistryServerFilters, 'search'>;

export const DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS: PatentGrantsRegistryAdvancedFilters = {
  grantStatuses: [],
  grantRegionKeys: [],
  grantIssueYears: [],
  grantRenewalYears: [],
};

export const PATENT_GRANT_STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'Активный', value: 'Активный' },
  { label: 'Неактивный', value: 'Неактивный' },
  { label: 'Истек', value: 'Истек' },
  { label: 'Отозван', value: 'Отозван' },
];
