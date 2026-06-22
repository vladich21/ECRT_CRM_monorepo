import { useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import type { PartnerListSortBy } from '../../../api/partners/partnerApi';
import { useListReturnFromDetail } from '../../../hooks/useListReturnFromDetail';
import { useRestoreToken } from '../../../hooks/useServerTablePagination';
import type { PartnerFilters } from '../PartnerFiltersModal';
import { parsePartnersListNavSnapshot } from '../utils/partnersListNavSnapshot';
import type { PartnersListPersistedUi } from '../utils/partnersListPersistedUi';
import {
  loadPartnersListPersistedUi,
  savePartnersListPersistedUi,
} from '../utils/partnersListPersistedUi';

const PERSIST_UI_DEBOUNCE_MS = 400;

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

type PersistedUiSnapshot = {
  searchQuery: string;
  appliedFilters: PartnerFilters;
  page: number;
  pageSize: number;
  sortBy: PartnerListSortBy;
  sortOrder: 'asc' | 'desc';
};

/**
 * Восстановление списка из карточки + localStorage и автосохранение UI.
 * restoreToken — сигнал для пагинации «не сбрасывать page после программного restore».
 */
export function usePartnersListUiState(
  location: Location,
  navigate: NavigateFunction,
  search: PartnersListSearch,
  filters: PartnersListFiltersApi,
  pagination: PartnersListPagination,
  persistedUi: PersistedUiSnapshot,
) {
  const [restoreToken, bumpRestoreToken] = useRestoreToken();
  const restoredFromDetailRef = useRef(false);
  const persistReadyRef = useRef(false);

  const applyListTabFilter = (patch: Partial<PartnerFilters>) => {
    restoredFromDetailRef.current = true;
    filters.setAppliedFilters(prev => ({ ...prev, ...patch }));
    filters.setDraftFilters(prev => ({ ...prev, ...patch }));
    bumpRestoreToken();
  };

  const applyListSnapshot = (snapshot: PartnersListPersistedUi) => {
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
  };

  const { pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.partnersListReturn,
    parse: parsePartnersListNavSnapshot,
    applyParsed: snapshot => {
      restoredFromDetailRef.current = true;
      applyListSnapshot(snapshot);
      savePartnersListPersistedUi(snapshot);
    },
    applyFallback: navigationState => {
      if (navigationState.listTab === 'deleted' || navigationState.deletionScope === 'deleted') {
        applyListTabFilter({ isDeleted: 'yes' });
        return;
      }
      if (navigationState.listTab === 'ready') {
        applyListTabFilter({ isApproved: 'yes' });
        return;
      }
      if (navigationState.listTab === 'in_progress') {
        applyListTabFilter({ isApproved: 'no' });
      }
    },
  });

  useLayoutEffect(() => {
    if (!restoredFromDetailRef.current) {
      const persisted = loadPartnersListPersistedUi();
      if (persisted) {
        applyListSnapshot(persisted);
      }
    }
    persistReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!persistReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      savePartnersListPersistedUi(persistedUi);
    }, PERSIST_UI_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    persistedUi.searchQuery,
    persistedUi.appliedFilters,
    persistedUi.page,
    persistedUi.pageSize,
    persistedUi.sortBy,
    persistedUi.sortOrder,
  ]);

  return { restoreToken, pendingScrollY };
}
