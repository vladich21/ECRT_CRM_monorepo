import type { Location, NavigateFunction } from 'react-router-dom';

import { useListReturnFromDetail } from '../../../hooks/useListReturnFromDetail';
import type { PatentAdvancedFilters, PatentFilterTab } from '../PatentsListPage.types';
import { buildPatentsListNavSnapshot, parsePatentsListNavSnapshot } from '../utils/patentsListNavSnapshot';

type PatentListPagination = {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

type PatentListSearch = {
  setSearchQuery: (query: string) => void;
  alignDebouncedWithQuery: (query: string) => void;
};

type PatentListFilters = {
  setActiveTab: (tab: PatentFilterTab) => void;
  setAppliedFilters: (filters: PatentAdvancedFilters) => void;
  setDraftFilters: (filters: PatentAdvancedFilters) => void;
};

export function usePatentsListRestoreFromDetail(
  location: Location,
  navigate: NavigateFunction,
  search: PatentListSearch,
  filters: PatentListFilters,
  pagination: PatentListPagination,
) {
  return useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.patentsListReturn,
    parse: parsePatentsListNavSnapshot,
    applyParsed: restoredListState => {
      search.setSearchQuery(restoredListState.searchQuery);
      search.alignDebouncedWithQuery(restoredListState.searchQuery);
      filters.setActiveTab(restoredListState.activeTab);
      filters.setAppliedFilters(restoredListState.appliedFilters);
      filters.setDraftFilters(restoredListState.appliedFilters);
      pagination.setPage(restoredListState.page);
      pagination.setPageSize(restoredListState.pageSize);
    },
    applyFallback: navigationState => {
      const tabFromNavigation = navigationState.tab;
      if (tabFromNavigation === 'all' || tabFromNavigation === 'active' || tabFromNavigation === 'deleted') {
        filters.setActiveTab(tabFromNavigation);
      }
    },
  });
}
