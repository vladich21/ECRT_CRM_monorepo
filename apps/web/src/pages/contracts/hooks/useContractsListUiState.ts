import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { useListReturnFromDetail } from '@/hooks/useListReturnFromDetail';
import { useRestoreToken } from '@/hooks/useServerTablePagination';

import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';
import { parseContractsListNavSnapshot } from '../utils/contractsListNavSnapshot';

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
) {
  const [restoreToken, bumpRestoreToken] = useRestoreToken();

  const { pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.contractsListReturn,
    parse: parseContractsListNavSnapshot,
    applyParsed: restoredListState => {
      setters.setSearchQuery(restoredListState.searchQuery);
      setters.flushDebouncedSearch(restoredListState.searchQuery.trim());
      setters.setActiveTab(restoredListState.activeTab);
      setters.setAppliedFilters(restoredListState.appliedFilters);
      setters.setDraftFilters(restoredListState.appliedFilters);
      setters.setPage(restoredListState.page);
      setters.setPageSize(restoredListState.pageSize);
      bumpRestoreToken();
    },
    applyFallback: navigationState => {
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

  return { restoreToken, pendingScrollY };
}
