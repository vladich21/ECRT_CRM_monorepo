import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';
import {
  loadContractsListPersistedUi,
  saveContractsListPersistedUi,
  type ContractsListPersistedUi,
} from '../utils/contractsListPersistedUi';

type ContractsListUiSetters = {
  setSearchQuery: (query: string) => void;
  flushDebouncedSearch: (query: string) => void;
  setActiveTab: (tab: FilterTab) => void;
  setAppliedFilters: Dispatch<SetStateAction<AdvancedFilters>>;
  setDraftFilters: Dispatch<SetStateAction<AdvancedFilters>>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

function coerceFilterTab(rawTab: unknown, validTabs: FilterTab[]): FilterTab | null {
  return validTabs.some(tab => tab === rawTab) ? (rawTab as FilterTab) : null;
}

const VALID_TABS: FilterTab[] = ['all', 'active', 'draft', 'inactive', 'deleted'];

export function useContractsListUiState(
  location: Location,
  navigate: NavigateFunction,
  setters: ContractsListUiSetters,
  persistedUi: ContractsListPersistedUi,
  routePartnerId?: string,
) {
  return useRegistryListUiState({
    location,
    navigate,
    load: () => loadContractsListPersistedUi(routePartnerId),
    save: snapshot =>
      saveContractsListPersistedUi(
        {
          searchQuery: snapshot.searchQuery,
          activeTab: snapshot.activeTab,
          appliedFilters: snapshot.appliedFilters,
          page: snapshot.page,
          pageSize: snapshot.pageSize,
        },
        routePartnerId,
      ),
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
      setters.setSearchQuery(snapshot.searchQuery);
      setters.flushDebouncedSearch(snapshot.searchQuery.trim());
      setters.setActiveTab(snapshot.activeTab);
      setters.setAppliedFilters(snapshot.appliedFilters);
      setters.setDraftFilters(snapshot.appliedFilters);
      setters.setPage(snapshot.page);
      setters.setPageSize(snapshot.pageSize);
      bumpRestoreToken();
    },
    applyFallback: (navigationState, { bumpRestoreToken }) => {
      if (navigationState.listTab != null) {
        const fallbackTab = coerceFilterTab(navigationState.listTab, VALID_TABS);
        if (fallbackTab) {
          setters.setActiveTab(fallbackTab);
          bumpRestoreToken();
        }
        return;
      }
      if (navigationState.deletionScope === 'deleted') {
        setters.setActiveTab('deleted');
        bumpRestoreToken();
      }
    },
  });
}
