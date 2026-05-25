import type { PatentGrantRegionKey } from './patentGrantRegions';

export type PatentGrantsRegistrySortBy =
  | 'patent_registration_number'
  | 'grant_date'
  | 'grant_number'
  | 'created_at';

export type PatentGrantsRegistryServerFilters = {
  search: string;
  departmentId: string | null;
  statusId: string | null;
  authorIds: string[];
  areaIds: string[];
  responsibleId: string | null;
  registrationYears: number[];
  registrationCirYears: number[];
  projectId: string | null;
  contractId: string | null;
  grantStatuses: string[];
  grantRegionKeys: PatentGrantRegionKey[];
  grantIssueYears: number[];
  grantRenewalYears: number[];
  sortBy: PatentGrantsRegistrySortBy;
  sortOrder: 'asc' | 'desc';
};

export type PatentGrantsRegistryAdvancedFilters = Omit<
  PatentGrantsRegistryServerFilters,
  'search' | 'sortBy' | 'sortOrder'
>;

export const DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS: PatentGrantsRegistryAdvancedFilters = {
  departmentId: null,
  statusId: null,
  authorIds: [],
  areaIds: [],
  responsibleId: null,
  registrationYears: [],
  registrationCirYears: [],
  projectId: null,
  contractId: null,
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

export const PATENT_GRANTS_REGISTRY_SORT_OPTIONS: { value: PatentGrantsRegistrySortBy; label: string }[] = [
  { value: 'patent_registration_number', label: 'По номеру РИД' },
  { value: 'grant_date', label: 'По дате выдачи' },
  { value: 'grant_number', label: 'По номеру документа' },
  { value: 'created_at', label: 'По дате создания' },
];
