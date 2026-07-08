import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import type {
  PatentGrantsRegistryAdvancedFilters,
  PatentGrantsRegistrySortBy,
} from '@/api/patents/patentGrantsRegistryFilters.types';
import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { PatentGrantsRegistryPersistedUi } from '../utils/patentGrantsRegistryPersistedUi';
import {
  loadPatentGrantsRegistryPersistedUi,
  savePatentGrantsRegistryPersistedUi,
} from '../utils/patentGrantsRegistryPersistedUi';

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

export function usePatentGrantsRegistryUiState(
  location: Location,
  navigate: NavigateFunction,
  search: PatentGrantsRegistrySearch,
  filters: PatentGrantsRegistryFiltersApi,
  pagination: PatentGrantsRegistryPagination,
  persistedUi: PatentGrantsRegistryPersistedUi,
) {
  return useRegistryListUiState({
    location,
    navigate,
    load: loadPatentGrantsRegistryPersistedUi,
    save: savePatentGrantsRegistryPersistedUi,
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
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
    },
  });
}
