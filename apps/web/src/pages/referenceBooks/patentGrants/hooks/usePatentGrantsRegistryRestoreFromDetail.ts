import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import type { PatentGrantsRegistryAdvancedFilters } from '@/api/patents/patentGrantsRegistryFilters.types';
import { useListReturnFromDetail } from '@/hooks/useListReturnFromDetail';

import { PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY } from '../navigation/patentGrantListNavigation';
import { parsePatentGrantsRegistryListSnapshot } from '../utils/patentGrantsRegistryNavSnapshot';
import { savePatentGrantsRegistryPersistedUi } from '../utils/patentGrantsRegistryPersistedUi';

type PatentGrantsRegistrySearch = {
  setSearchQuery: (query: string) => void;
  alignDebouncedWithQuery: (query: string) => void;
};

type PatentGrantsRegistryFiltersSlice = {
  setGrantScopeTab: (tab: PatentGrantRegistryListScope) => void;
  setAppliedFilters: Dispatch<SetStateAction<PatentGrantsRegistryAdvancedFilters>>;
  setDraftFilters: Dispatch<SetStateAction<PatentGrantsRegistryAdvancedFilters>>;
};

type PatentGrantsRegistryPagination = {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export type UsePatentGrantsRegistryRestoreFromDetailOptions = {
  restoredFromNavigationRef?: MutableRefObject<boolean>;
};

export function usePatentGrantsRegistryRestoreFromDetail(
  location: Location,
  navigate: NavigateFunction,
  search: PatentGrantsRegistrySearch,
  filters: PatentGrantsRegistryFiltersSlice,
  pagination: PatentGrantsRegistryPagination,
  options?: UsePatentGrantsRegistryRestoreFromDetailOptions,
) {
  const restoredFromNavigationRef = options?.restoredFromNavigationRef;

  return useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState[PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY],
    parse: parsePatentGrantsRegistryListSnapshot,
    applyParsed: restoredListState => {
      if (restoredFromNavigationRef) restoredFromNavigationRef.current = true;
      search.setSearchQuery(restoredListState.searchQuery);
      search.alignDebouncedWithQuery(restoredListState.searchQuery.trim());
      filters.setGrantScopeTab(restoredListState.grantScopeTab);
      filters.setAppliedFilters(restoredListState.appliedFilters);
      filters.setDraftFilters(restoredListState.appliedFilters);
      pagination.setPage(restoredListState.page);
      pagination.setPageSize(restoredListState.pageSize);
      savePatentGrantsRegistryPersistedUi({
        searchQuery: restoredListState.searchQuery,
        grantScopeTab: restoredListState.grantScopeTab,
        appliedFilters: restoredListState.appliedFilters,
        page: restoredListState.page,
        pageSize: restoredListState.pageSize,
      });
    },
  });
}
