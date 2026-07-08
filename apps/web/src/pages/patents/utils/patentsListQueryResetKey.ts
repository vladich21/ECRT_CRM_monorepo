import type { PatentListSortBy } from '@/api/patents/patentApi';

import type { PatentAdvancedFilters, PatentFilterTab } from '../types/PatentsListPage.types';

export function buildPatentsListFiltersResetKey(filters: PatentAdvancedFilters): string {
  return JSON.stringify({
    departmentId: filters.departmentId,
    statusId: filters.statusId,
    authorIds: [...(filters.authorIds ?? [])].sort(),
    areaIds: [...(filters.areaIds ?? [])].sort(),
    responsibleId: filters.responsibleId,
    registrationYears: [...(filters.registrationYears ?? [])].sort((a, b) => a - b),
    registrationCirYears: [...(filters.registrationCirYears ?? [])].sort((a, b) => a - b),
    projectId: filters.projectId,
    contractId: filters.contractId,
    grantRegionKeys: [...(filters.grantRegionKeys ?? [])].sort(),
  });
}

/** Ключ параметров серверного запроса (без page). При изменении - сброс на 1-ю страницу. */
export function buildPatentsListQueryResetKey(params: {
  debouncedSearch: string;
  activeTab: PatentFilterTab;
  appliedFilters: PatentAdvancedFilters;
  sortBy: PatentListSortBy;
  sortOrder: 'asc' | 'desc';
}): string {
  return JSON.stringify({
    search: params.debouncedSearch.trim(),
    tab: params.activeTab,
    filters: buildPatentsListFiltersResetKey(params.appliedFilters),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}
