import type { MutableRefObject } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PatentListSortBy } from '@/api/patents/patentApi';
import { useListReturnFromDetail } from '@/hooks/useListReturnFromDetail';
import type { PatentAdvancedFilters, PatentFilterTab } from '../types/PatentsListPage.types';
import { parsePatentsListNavSnapshot } from '../utils/patentsListNavSnapshot';
import { savePatentsListPersistedUi } from '../utils/patentsListPersistedUi';

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
  restoreListSorting: (next: { sortBy: PatentListSortBy; sortOrder: 'asc' | 'desc' }) => void;
};

export type UsePatentsListRestoreFromDetailOptions = {
  restoredFromNavigationRef?: MutableRefObject<boolean>;
};

export function usePatentsListRestoreFromDetail(
  location: Location,
  navigate: NavigateFunction,
  search: PatentListSearch,
  filters: PatentListFilters,
  pagination: PatentListPagination,
  options?: UsePatentsListRestoreFromDetailOptions,
) {
  const restoredFromNavigationRef = options?.restoredFromNavigationRef;

  return useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.patentsListReturn,
    parse: parsePatentsListNavSnapshot,
    applyParsed: restoredListState => {
      if (restoredFromNavigationRef) restoredFromNavigationRef.current = true;
      search.setSearchQuery(restoredListState.searchQuery);
      search.alignDebouncedWithQuery(restoredListState.searchQuery);
      filters.setActiveTab(restoredListState.activeTab);
      filters.setAppliedFilters(restoredListState.appliedFilters);
      filters.setDraftFilters(restoredListState.appliedFilters);
      pagination.setPage(restoredListState.page);
      pagination.setPageSize(restoredListState.pageSize);
      filters.restoreListSorting({
        sortBy: restoredListState.sortBy,
        sortOrder: restoredListState.sortOrder,
      });
      savePatentsListPersistedUi({
        searchQuery: restoredListState.searchQuery,
        activeTab: restoredListState.activeTab,
        appliedFilters: restoredListState.appliedFilters,
        page: restoredListState.page,
        pageSize: restoredListState.pageSize,
        sortBy: restoredListState.sortBy,
        sortOrder: restoredListState.sortOrder,
      });
    },
    applyFallback: navigationState => {
      const tabFromNavigation = navigationState.tab;
      if (tabFromNavigation === 'all' || tabFromNavigation === 'deleted') {
        if (restoredFromNavigationRef) restoredFromNavigationRef.current = true;
        filters.setActiveTab(tabFromNavigation);
        return;
      }
      if (tabFromNavigation === 'active') {
        if (restoredFromNavigationRef) restoredFromNavigationRef.current = true;
        filters.setActiveTab('all');
      }
    },
  });
}
