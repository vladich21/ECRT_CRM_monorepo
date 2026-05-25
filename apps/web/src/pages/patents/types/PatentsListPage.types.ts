import type { PatentGrantRegionKey } from '@/api/patents/patentGrantRegions';

export type PatentFilterTab = 'all' | 'deleted';

export type ActionType = PatentFilterTab;

export type PatentListFilterSelectOption = { label: string; value: string };

export type PatentListFiltersSelectOptions = {
  departments: PatentListFilterSelectOption[];
  statuses: PatentListFilterSelectOption[];
  users: PatentListFilterSelectOption[];
  projects: PatentListFilterSelectOption[];
  contracts: PatentListFilterSelectOption[];
  applicationAreas: PatentListFilterSelectOption[];
  calendarYears: Array<{ label: string; value: number }>;
};

export type PatentAdvancedFilters = {
  departmentId: string | null;
  statusId: string | null;
  authorIds: string[];
  areaIds: string[];
  responsibleId: string | null;
  registrationYears: number[];
  registrationCirYears: number[];
  projectId: string | null;
  contractId: string | null;
  grantRegionKeys: PatentGrantRegionKey[];
};

export const DEFAULT_PATENT_FILTERS: PatentAdvancedFilters = {
  departmentId: null,
  statusId: null,
  authorIds: [],
  areaIds: [],
  responsibleId: null,
  registrationYears: [],
  registrationCirYears: [],
  projectId: null,
  contractId: null,
  grantRegionKeys: [],
};

export const PATENT_FILTER_TABS: { key: PatentFilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'deleted', label: 'Удаленные' },
];
