import { useMemo } from 'react';

import type {
  PatentGrantsRegistryAdvancedFilters,
  PatentGrantsRegistryServerFilters,
} from '../../../../api/patents/patentGrantsRegistryFilters.types';

export function usePatentGrantsRegistryServerFilters(
  debouncedSearch: string,
  appliedFilters: PatentGrantsRegistryAdvancedFilters,
): PatentGrantsRegistryServerFilters {
  return useMemo(
    () => ({
      ...appliedFilters,
      search: debouncedSearch,
    }),
    [appliedFilters, debouncedSearch],
  );
}
