import type { PartnerListSortBy } from '@/api/partners/partnerApi';

import type { PartnerFilters } from '../PartnerFiltersModal';

import { parsePartnersListPersistedUi, serializePartnersListPersistedUi } from './partnersListNavSnapshot';

const PARTNERS_LIST_UI_STORAGE_KEY = 'srn.partnersList.ui.v1';

export type PartnersListPersistedUi = NonNullable<ReturnType<typeof parsePartnersListPersistedUi>>;

export function loadPartnersListPersistedUi(): PartnersListPersistedUi | null {
  try {
    const raw = localStorage.getItem(PARTNERS_LIST_UI_STORAGE_KEY);
    if (!raw) return null;
    return parsePartnersListPersistedUi(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function savePartnersListPersistedUi(params: {
  searchQuery: string;
  appliedFilters: PartnerFilters;
  page: number;
  pageSize: number;
  sortBy: PartnerListSortBy;
  sortOrder: 'asc' | 'desc';
}): void {
  try {
    const snapshot = serializePartnersListPersistedUi(
      params.searchQuery,
      params.appliedFilters,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
    );
    localStorage.setItem(PARTNERS_LIST_UI_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
