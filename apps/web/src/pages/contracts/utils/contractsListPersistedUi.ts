import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';

import { parseContractsListPersistedUi, serializeContractsListPersistedUi } from './contractsListNavSnapshot';

const STORAGE_KEY_PREFIX = 'srn.contractsList.ui.v1';

export type ContractsListPersistedUi = NonNullable<ReturnType<typeof parseContractsListPersistedUi>>;

function storageKey(routePartnerId?: string): string {
  return routePartnerId ? `${STORAGE_KEY_PREFIX}:partner:${routePartnerId}` : STORAGE_KEY_PREFIX;
}

export function loadContractsListPersistedUi(routePartnerId?: string): ContractsListPersistedUi | null {
  try {
    const raw = localStorage.getItem(storageKey(routePartnerId));
    if (!raw) return null;
    return parseContractsListPersistedUi(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveContractsListPersistedUi(
  params: {
    searchQuery: string;
    activeTab: FilterTab;
    appliedFilters: AdvancedFilters;
    page: number;
    pageSize: number;
  },
  routePartnerId?: string,
): void {
  try {
    const snapshot = serializeContractsListPersistedUi(
      params.searchQuery,
      params.activeTab,
      params.appliedFilters,
      params.page,
      params.pageSize,
    );
    localStorage.setItem(storageKey(routePartnerId), JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
