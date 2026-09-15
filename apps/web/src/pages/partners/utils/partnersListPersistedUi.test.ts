import { describe, expect, it, vi } from 'vitest';

import { EMPTY_FILTERS, type PartnerFilters } from '../PartnerFiltersModal';
import {
  parsePartnersListPersistedUi,
  serializePartnersListPersistedUi,
} from './partnersListNavSnapshot';
import { loadPartnersListPersistedUi, savePartnersListPersistedUi } from './partnersListPersistedUi';

describe('partnersListPersistedUi', () => {
  it('round-trips v3 schema with sort and filters', () => {
    const appliedFilters: PartnerFilters = {
      ...EMPTY_FILTERS,
      typeIds: ['type-1'],
      statusIds: ['status-1'],
      evaluationCategoryTokens: ['A', 'none'],
      isKeySupplier: 'yes',
    };

    const raw = serializePartnersListPersistedUi(
      'partner search',
      appliedFilters,
      3,
      25,
      'weighted_score',
      'desc',
    );
    const parsed = parsePartnersListPersistedUi(raw);

    expect(parsed).toEqual({
      searchQuery: 'partner search',
      appliedFilters,
      page: 3,
      pageSize: 25,
      sortBy: 'weighted_score',
      sortOrder: 'desc',
    });
  });

  it('maps legacy readiness tabs into isApproved filter', () => {
    const ready = parsePartnersListPersistedUi({
      version: 3,
      searchQuery: '',
      activeTab: 'ready',
      applied: {},
      page: 1,
      pageSize: 20,
    });
    const inProgress = parsePartnersListPersistedUi({
      version: 3,
      searchQuery: '',
      activeTab: 'in_progress',
      applied: {},
      page: 1,
      pageSize: 20,
    });

    expect(ready?.appliedFilters.isApproved).toBe('yes');
    expect(inProgress?.appliedFilters.isApproved).toBe('no');
  });

  it('load/save round-trips through localStorage', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });

    savePartnersListPersistedUi({
      searchQuery: 'persisted',
      appliedFilters: { ...EMPTY_FILTERS, isDeleted: 'yes' },
      page: 2,
      pageSize: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(loadPartnersListPersistedUi()).toMatchObject({
      searchQuery: 'persisted',
      page: 2,
      appliedFilters: { isDeleted: 'yes' },
    });

    vi.unstubAllGlobals();
  });
});
