import type { PatentListSortBy } from '@/api/patents/patentApi';

import type { PatentAdvancedFilters, PatentFilterTab } from '../types/PatentsListPage.types';

import { buildPatentsListNavSnapshot, parsePatentsListNavSnapshot } from './patentsListNavSnapshot';

const PATENTS_LIST_UI_STORAGE_KEY = 'srn.patentsList.ui.v1';

export type PatentsListPersistedUi = NonNullable<ReturnType<typeof parsePatentsListNavSnapshot>>;

export function loadPatentsListPersistedUi(): PatentsListPersistedUi | null {
  try {
    const raw = localStorage.getItem(PATENTS_LIST_UI_STORAGE_KEY);
    if (!raw) return null;
    return parsePatentsListNavSnapshot(JSON.parse(raw) as unknown);
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
    const snapshot = buildPatentsListNavSnapshot(
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
