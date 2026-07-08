import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_ADVANCED_FILTERS } from '../list/ContractsListPage.types';
import {
  parseContractsListPersistedUi,
  serializeContractsListPersistedUi,
} from './contractsListNavSnapshot';
import { loadContractsListPersistedUi, saveContractsListPersistedUi } from './contractsListPersistedUi';

describe('contractsListPersistedUi', () => {
  it('round-trips serialize/parse with date range and amounts', () => {
    const applied = {
      ...DEFAULT_ADVANCED_FILTERS,
      partnerId: 'partner-1',
      categoryId: 'cat-1',
      stateId: 'state-1',
      dateRange: [dayjs('2024-03-01'), dayjs('2024-06-30')] as [dayjs.Dayjs, dayjs.Dayjs],
      amountMin: 1000,
      amountMax: 50000,
    };

    const raw = serializeContractsListPersistedUi('contract search', 'draft', applied, 2, 50);
    const parsed = parseContractsListPersistedUi(raw);

    expect(parsed).toEqual({
      searchQuery: 'contract search',
      activeTab: 'draft',
      appliedFilters: applied,
      page: 2,
      pageSize: 50,
    });
  });

  it('load/save uses nested partner storage key', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });

    saveContractsListPersistedUi(
      {
        searchQuery: 'nested',
        activeTab: 'all',
        appliedFilters: DEFAULT_ADVANCED_FILTERS,
        page: 4,
        pageSize: 20,
      },
      'partner-42',
    );

    expect(storage.has('srn.contractsList.ui.v1:partner:partner-42')).toBe(true);
    expect(loadContractsListPersistedUi('partner-42')).toMatchObject({
      searchQuery: 'nested',
      page: 4,
    });

    vi.unstubAllGlobals();
  });
});
