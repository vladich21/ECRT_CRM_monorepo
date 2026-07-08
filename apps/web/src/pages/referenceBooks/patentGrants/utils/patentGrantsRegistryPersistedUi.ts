import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import type {
  PatentGrantsRegistryAdvancedFilters,
  PatentGrantsRegistrySortBy,
} from '@/api/patents/patentGrantsRegistryFilters.types';

import {
  parsePatentGrantsRegistryPersistedUi,
  serializePatentGrantsRegistryPersistedUi,
} from './patentGrantsRegistryNavSnapshot';

const STORAGE_KEY = 'srn.patentGrantsRegistry.ui.v1';

export type PatentGrantsRegistryPersistedUi = NonNullable<
  ReturnType<typeof parsePatentGrantsRegistryPersistedUi>
>;

export function loadPatentGrantsRegistryPersistedUi(): PatentGrantsRegistryPersistedUi | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePatentGrantsRegistryPersistedUi(JSON.parse(raw) as unknown);
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
  sortBy: PatentGrantsRegistrySortBy;
  sortOrder: 'asc' | 'desc';
}): void {
  try {
    const snapshot = serializePatentGrantsRegistryPersistedUi(
      params.searchQuery,
      params.grantScopeTab,
      params.appliedFilters,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
