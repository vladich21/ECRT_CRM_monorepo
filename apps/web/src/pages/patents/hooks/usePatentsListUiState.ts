import { useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PatentListSortBy } from '@/api/patents/patentApi';
import { useListReturnFromDetail } from '@/hooks/useListReturnFromDetail';
import { useRestoreToken } from '@/hooks/useServerTablePagination';

import type { PatentAdvancedFilters, PatentFilterTab } from '../types/PatentsListPage.types';
import { parsePatentsListNavSnapshot } from '../utils/patentsListNavSnapshot';
import type { PatentsListPersistedUi } from '../utils/patentsListPersistedUi';
import { loadPatentsListPersistedUi, savePatentsListPersistedUi } from '../utils/patentsListPersistedUi';

const PERSIST_UI_DEBOUNCE_MS = 400;

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

type PersistedUiSnapshot = {
  searchQuery: string;
  activeTab: PatentFilterTab;
  appliedFilters: PatentAdvancedFilters;
  page: number;
  pageSize: number;
  sortBy: PatentListSortBy;
  sortOrder: 'asc' | 'desc';
};

export function usePatentsListUiState(
  location: Location,
  navigate: NavigateFunction,
  search: PatentsListSearch,
  filters: PatentsListFiltersApi,
  pagination: PatentsListPagination,
  persistedUi: PersistedUiSnapshot,
) {
  const [restoreToken, bumpRestoreToken] = useRestoreToken();
  const restoredFromDetailRef = useRef(false);
  const persistReadyRef = useRef(false);

  const applyActiveTab = (tab: PatentFilterTab) => {
    restoredFromDetailRef.current = true;
    filters.setActiveTab(tab);
    bumpRestoreToken();
  };

  const applyListSnapshot = (snapshot: PatentsListPersistedUi) => {
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
  };

  const { pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.patentsListReturn,
    parse: parsePatentsListNavSnapshot,
    applyParsed: snapshot => {
      restoredFromDetailRef.current = true;
      applyListSnapshot(snapshot);
      savePatentsListPersistedUi(snapshot);
    },
    applyFallback: navigationState => {
      const tabFromNavigation = navigationState.tab;
      if (tabFromNavigation === 'all' || tabFromNavigation === 'deleted') {
        applyActiveTab(tabFromNavigation);
        return;
      }
      if (tabFromNavigation === 'active') {
        applyActiveTab('all');
      }
    },
  });

  useLayoutEffect(() => {
    if (!restoredFromDetailRef.current) {
      const persisted = loadPatentsListPersistedUi();
      if (persisted) {
        applyListSnapshot(persisted);
      }
    }
    persistReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!persistReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      savePatentsListPersistedUi(persistedUi);
    }, PERSIST_UI_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    persistedUi.searchQuery,
    persistedUi.activeTab,
    persistedUi.appliedFilters,
    persistedUi.page,
    persistedUi.pageSize,
    persistedUi.sortBy,
    persistedUi.sortOrder,
  ]);

  return { restoreToken, pendingScrollY };
}
