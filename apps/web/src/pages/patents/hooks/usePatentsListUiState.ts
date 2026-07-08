import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PatentListSortBy } from '@/api/patents/patentApi';
import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { PatentAdvancedFilters, PatentFilterTab } from '../types/PatentsListPage.types';
import type { PatentsListPersistedUi } from '../utils/patentsListPersistedUi';
import { loadPatentsListPersistedUi, savePatentsListPersistedUi } from '../utils/patentsListPersistedUi';

type PatentsListSearch = {
  setSearchQuery: (query: string) => void;
  alignDebouncedWithQuery: (query: string) => void;
};

type PatentsListFiltersApi = {
  setActiveTab: (tab: PatentFilterTab) => void;
  setAppliedFilters: Dispatch<SetStateAction<PatentAdvancedFilters>>;
  setDraftFilters: Dispatch<SetStateAction<PatentAdvancedFilters>>;
  restoreListSorting: (next: { sortBy: PatentListSortBy; sortOrder: 'asc' | 'desc' }) => void;
};

type PatentsListPagination = {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function usePatentsListUiState(
  location: Location,
  navigate: NavigateFunction,
  search: PatentsListSearch,
  filters: PatentsListFiltersApi,
  pagination: PatentsListPagination,
  persistedUi: PatentsListPersistedUi,
) {
  return useRegistryListUiState({
    location,
    navigate,
    load: loadPatentsListPersistedUi,
    save: savePatentsListPersistedUi,
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
      search.setSearchQuery(snapshot.searchQuery);
      search.alignDebouncedWithQuery(snapshot.searchQuery.trim());
      filters.setActiveTab(snapshot.activeTab);
      filters.setAppliedFilters(snapshot.appliedFilters);
      filters.setDraftFilters(snapshot.appliedFilters);
      pagination.setPage(snapshot.page);
      pagination.setPageSize(snapshot.pageSize);
      filters.restoreListSorting({
        sortBy: snapshot.sortBy,
        sortOrder: snapshot.sortOrder,
      });
      bumpRestoreToken();
    },
    applyFallback: (navigationState, { bumpRestoreToken }) => {
      const tabFromNavigation = navigationState.tab;
      if (tabFromNavigation === 'all' || tabFromNavigation === 'deleted') {
        filters.setActiveTab(tabFromNavigation);
        bumpRestoreToken();
        return;
      }
      if (tabFromNavigation === 'active') {
        filters.setActiveTab('all');
        bumpRestoreToken();
      }
    },
  });
}
