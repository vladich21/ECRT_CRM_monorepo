import { useMemo } from 'react';

import type { PatentsListServerFilters } from '../../../api/patents/patentApiHooks';

import type { PatentAdvancedFilters } from '../PatentsListPage.types';

export function usePatentsListServerFilters(
  debouncedSearch: string,
  appliedFilters: PatentAdvancedFilters,
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
    }),
    [debouncedSearch, appliedFilters],
  );
}
