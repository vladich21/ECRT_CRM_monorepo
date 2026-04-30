import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import type { PatentGrantsRegistryAdvancedFilters } from '@/api/patents/patentGrantsRegistryFilters.types';

import {
  buildPatentGrantsRegistryListSnapshot,
  parsePatentGrantsRegistryListSnapshot,
} from './patentGrantsRegistryNavSnapshot';

const STORAGE_KEY = 'srn.patentGrantsRegistry.ui.v1';

export type PatentGrantsRegistryPersistedUi = NonNullable<
  ReturnType<typeof parsePatentGrantsRegistryListSnapshot>
>;

export function loadPatentGrantsRegistryPersistedUi(): PatentGrantsRegistryPersistedUi | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePatentGrantsRegistryListSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function savePatentGrantsRegistryPersistedUi(params: {
  searchQuery: string;
  grantScopeTab: PatentGrantRegistryListScope;
  appliedFilters: PatentGrantsRegistryAdvancedFilters;
  page: number;
  pageSize: number;
}): void {
  try {
    const snapshot = buildPatentGrantsRegistryListSnapshot(
      params.searchQuery,
      params.grantScopeTab,
      params.appliedFilters,
      params.page,
      params.pageSize,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
