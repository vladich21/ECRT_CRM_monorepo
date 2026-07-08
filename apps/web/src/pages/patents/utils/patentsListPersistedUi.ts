import type { PatentListSortBy } from '@/api/patents/patentApi';

import type { PatentAdvancedFilters, PatentFilterTab } from '../types/PatentsListPage.types';

import { parsePatentsListPersistedUi, serializePatentsListPersistedUi } from './patentsListNavSnapshot';

const PATENTS_LIST_UI_STORAGE_KEY = 'srn.patentsList.ui.v1';

export type PatentsListPersistedUi = NonNullable<ReturnType<typeof parsePatentsListPersistedUi>>;

export function loadPatentsListPersistedUi(): PatentsListPersistedUi | null {
  try {
    const raw = localStorage.getItem(PATENTS_LIST_UI_STORAGE_KEY);
    if (!raw) return null;
    return parsePatentsListPersistedUi(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function savePatentsListPersistedUi(params: {
  searchQuery: string;
  activeTab: PatentFilterTab;
  appliedFilters: PatentAdvancedFilters;
  page: number;
  pageSize: number;
  sortBy: PatentListSortBy;
  sortOrder: 'asc' | 'desc';
}): void {
  try {
    const snapshot = serializePatentsListPersistedUi(
      params.searchQuery,
      params.activeTab,
      params.appliedFilters,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
    );
    localStorage.setItem(PATENTS_LIST_UI_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
