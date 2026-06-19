import { useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import type {
  PatentGrantsRegistryAdvancedFilters,
  PatentGrantsRegistrySortBy,
} from '@/api/patents/patentGrantsRegistryFilters.types';
import { useListReturnFromDetail } from '@/hooks/useListReturnFromDetail';
import { useRestoreToken } from '@/hooks/useServerTablePagination';

import { PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY } from '../navigation/patentGrantListNavigation';
import { parsePatentGrantsRegistryListSnapshot } from '../utils/patentGrantsRegistryNavSnapshot';
import type { PatentGrantsRegistryPersistedUi } from '../utils/patentGrantsRegistryPersistedUi';
import {
  loadPatentGrantsRegistryPersistedUi,
  savePatentGrantsRegistryPersistedUi,
} from '../utils/patentGrantsRegistryPersistedUi';

const PERSIST_UI_DEBOUNCE_MS = 400;

type PatentGrantsRegistrySearch = {
  setSearchQuery: (query: string) => void;
  alignDebouncedWithQuery: (query: string) => void;
};

type PatentGrantsRegistryFiltersApi = {
  setGrantScopeTab: (tab: PatentGrantRegistryListScope) => void;
  setAppliedFilters: Dispatch<SetStateAction<PatentGrantsRegistryAdvancedFilters>>;
  setDraftFilters: Dispatch<SetStateAction<PatentGrantsRegistryAdvancedFilters>>;
  restoreListSorting: (next: { sortBy: PatentGrantsRegistrySortBy; sortOrder: 'asc' | 'desc' }) => void;
};

type PatentGrantsRegistryPagination = {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

type PersistedUiSnapshot = {
  searchQuery: string;
  grantScopeTab: PatentGrantRegistryListScope;
  appliedFilters: PatentGrantsRegistryAdvancedFilters;
  page: number;
  pageSize: number;
  sortBy: PatentGrantsRegistrySortBy;
  sortOrder: 'asc' | 'desc';
};

export function usePatentGrantsRegistryUiState(
  location: Location,
  navigate: NavigateFunction,
  search: PatentGrantsRegistrySearch,
  filters: PatentGrantsRegistryFiltersApi,
  pagination: PatentGrantsRegistryPagination,
  persistedUi: PersistedUiSnapshot,
) {
  const [restoreToken, bumpRestoreToken] = useRestoreToken();
  const restoredFromDetailRef = useRef(false);
  const persistReadyRef = useRef(false);

  const applyListSnapshot = (snapshot: PatentGrantsRegistryPersistedUi) => {
    search.setSearchQuery(snapshot.searchQuery);
    search.alignDebouncedWithQuery(snapshot.searchQuery.trim());
    filters.setGrantScopeTab(snapshot.grantScopeTab);
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
    getRawSnapshot: navigationState => navigationState[PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY],
    parse: parsePatentGrantsRegistryListSnapshot,
    applyParsed: snapshot => {
      restoredFromDetailRef.current = true;
      applyListSnapshot(snapshot);
      savePatentGrantsRegistryPersistedUi(snapshot);
    },
  });

  useLayoutEffect(() => {
    if (!restoredFromDetailRef.current) {
      const persisted = loadPatentGrantsRegistryPersistedUi();
      if (persisted) {
        applyListSnapshot(persisted);
      }
    }
    persistReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!persistReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      savePatentGrantsRegistryPersistedUi(persistedUi);
    }, PERSIST_UI_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    persistedUi.searchQuery,
    persistedUi.grantScopeTab,
    persistedUi.appliedFilters,
    persistedUi.page,
    persistedUi.pageSize,
    persistedUi.sortBy,
    persistedUi.sortOrder,
  ]);

  return { restoreToken, pendingScrollY };
}
