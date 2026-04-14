export type PatentFilterTab = 'all' | 'active' | 'deleted';

export type PatentAdvancedFilters = {
  departmentId: string | null;
  statusId: string | null;
  authorIds: string[];
  responsibleId: string | null;
  registrationYears: number[];
  projectId: string | null;
};

export const DEFAULT_PATENT_FILTERS: PatentAdvancedFilters = {
  departmentId: null,
  statusId: null,
  authorIds: [],
  responsibleId: null,
  registrationYears: [],
  projectId: null,
};

export const PATENT_FILTER_TABS: { key: PatentFilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'deleted', label: 'Удалённые' },
];
