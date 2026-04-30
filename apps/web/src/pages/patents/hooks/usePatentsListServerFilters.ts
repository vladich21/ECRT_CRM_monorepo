import { useMemo } from 'react';

import type { PatentListSortBy } from '@/api/patents/patentApi';
import type { PatentsListServerFilters } from '@/api/patents/patentListFilters.types';

import type { PatentAdvancedFilters } from '../types/PatentsListPage.types';

export function usePatentsListServerFilters(
  debouncedSearch: string,
  appliedFilters: PatentAdvancedFilters,
  sortBy: PatentListSortBy,
  sortOrder: 'asc' | 'desc',
): PatentsListServerFilters {
  return useMemo(
    () => ({
      search: debouncedSearch,
      departmentId: appliedFilters.departmentId,
      statusId: appliedFilters.statusId,
      authorIds: appliedFilters.authorIds ?? [],
      areaIds: appliedFilters.areaIds ?? [],
      responsibleId: appliedFilters.responsibleId,
      registrationYears: appliedFilters.registrationYears ?? [],
      registrationCirYears: appliedFilters.registrationCirYears ?? [],
      projectId: appliedFilters.projectId,
      contractId: appliedFilters.contractId,
      grantRegionKeys: appliedFilters.grantRegionKeys ?? [],
      sortBy,
      sortOrder,
    }),
    [debouncedSearch, appliedFilters, sortBy, sortOrder],
  );
}
