import { useMemo } from 'react';

import type {
  PatentGrantsRegistryAdvancedFilters,
  PatentGrantsRegistryServerFilters,
  PatentGrantsRegistrySortBy,
} from '../../../../api/patents/patentGrantsRegistryFilters.types';

export function usePatentGrantsRegistryServerFilters(
  debouncedSearch: string,
  appliedFilters: PatentGrantsRegistryAdvancedFilters,
  sortBy: PatentGrantsRegistrySortBy,
  sortOrder: 'asc' | 'desc',
): PatentGrantsRegistryServerFilters {
  return useMemo(
    () => ({
      ...appliedFilters,
      search: debouncedSearch,
      sortBy,
      sortOrder,
    }),
    [appliedFilters, debouncedSearch, sortBy, sortOrder],
  );
}
