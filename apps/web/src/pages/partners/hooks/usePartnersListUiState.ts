import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PartnerListSortBy } from '@/api/partners/partnerApi';
import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { PartnerFilters } from '../PartnerFiltersModal';
import type { PartnersListPersistedUi } from '../utils/partnersListPersistedUi';
import {
  loadPartnersListPersistedUi,
  savePartnersListPersistedUi,
} from '../utils/partnersListPersistedUi';

type PartnersListSearch = {
  setSearchQuery: (query: string) => void;
  flushDebouncedSearch: (query: string) => void;
};

type PartnersListFiltersApi = {
  setAppliedFilters: Dispatch<SetStateAction<PartnerFilters>>;
  setDraftFilters: Dispatch<SetStateAction<PartnerFilters>>;
  restoreListSorting: (next: { sortBy: PartnerListSortBy; sortOrder: 'asc' | 'desc' }) => void;
};

type PartnersListPagination = {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function usePartnersListUiState(
  location: Location,
  navigate: NavigateFunction,
  search: PartnersListSearch,
  filters: PartnersListFiltersApi,
  pagination: PartnersListPagination,
  persistedUi: PartnersListPersistedUi,
) {
  const applyListTabFilter = (patch: Partial<PartnerFilters>, bumpRestoreToken: () => void) => {
    filters.setAppliedFilters(prev => ({ ...prev, ...patch }));
    filters.setDraftFilters(prev => ({ ...prev, ...patch }));
    bumpRestoreToken();
  };

  return useRegistryListUiState({
    location,
    navigate,
    load: loadPartnersListPersistedUi,
    save: savePartnersListPersistedUi,
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
      search.setSearchQuery(snapshot.searchQuery);
      search.flushDebouncedSearch(snapshot.searchQuery.trim());
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
      if (navigationState.listTab === 'deleted' || navigationState.deletionScope === 'deleted') {
        applyListTabFilter({ isDeleted: 'yes' }, bumpRestoreToken);
        return;
      }
      if (navigationState.listTab === 'ready') {
        applyListTabFilter({ isApproved: 'yes' }, bumpRestoreToken);
        return;
      }
      if (navigationState.listTab === 'in_progress') {
        applyListTabFilter({ isApproved: 'no' }, bumpRestoreToken);
      }
    },
  });
}
