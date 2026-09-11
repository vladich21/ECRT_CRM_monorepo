import type { Location, NavigateFunction } from 'react-router-dom';

import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { PurchaseRequestListTab } from '../purchaseRequestLabels';
import type { PurchaseRequestListColumnKey } from '../purchaseRequestListColumns';
import {
  loadPurchaseRequestsListPersistedUi,
  savePurchaseRequestsListPersistedUi,
  type PurchaseRequestsListPersistedUi,
  type PurchaseRequestsListView,
} from '../utils/purchaseRequestsListPersistedUi';

type Setters = {
  setSearchQuery: (query: string) => void;
  flushDebouncedSearch: (query: string) => void;
  setActiveTab: (tab: PurchaseRequestListTab) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setView: (view: PurchaseRequestsListView) => void;
  setVisibleColumns: (columns: PurchaseRequestListColumnKey[]) => void;
};

export function usePurchaseRequestsListUiState(
  location: Location,
  navigate: NavigateFunction,
  setters: Setters,
  persistedUi: PurchaseRequestsListPersistedUi,
) {
  return useRegistryListUiState({
    location,
    navigate,
    load: loadPurchaseRequestsListPersistedUi,
    save: savePurchaseRequestsListPersistedUi,
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
      setters.setSearchQuery(snapshot.searchQuery);
      setters.flushDebouncedSearch(snapshot.searchQuery.trim());
      setters.setActiveTab(snapshot.activeTab);
      setters.setPage(snapshot.page);
      setters.setPageSize(snapshot.pageSize);
      setters.setView(snapshot.view);
      setters.setVisibleColumns(snapshot.visibleColumns);
      bumpRestoreToken();
    },
  });
}
