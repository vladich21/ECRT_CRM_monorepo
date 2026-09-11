import { describe, expect, it } from 'vitest';

import { DEFAULT_PURCHASE_REQUEST_LIST_COLUMNS, normalizePurchaseRequestListColumns } from '../purchaseRequestListColumns';
import { parsePurchaseRequestsListPersistedUi } from './purchaseRequestsListPersistedUi';

describe('parsePurchaseRequestsListPersistedUi', () => {
  it('fills view and columns when an old snapshot has neither', () => {
    const parsed = parsePurchaseRequestsListPersistedUi({
      version: 1,
      searchQuery: 'кабель',
      activeTab: 'draft',
      page: 2,
      pageSize: 20,
    });
    expect(parsed).toMatchObject({
      searchQuery: 'кабель',
      activeTab: 'draft',
      page: 2,
      view: 'cards',
      visibleColumns: DEFAULT_PURCHASE_REQUEST_LIST_COLUMNS,
    });
  });

  it('keeps table view and restores columns, ignoring unknown keys', () => {
    const parsed = parsePurchaseRequestsListPersistedUi({
      version: 1,
      searchQuery: '',
      activeTab: 'all',
      page: 1,
      pageSize: 20,
      view: 'table',
      visibleColumns: ['number', 'subject', 'status', 'not-a-column'],
    });
    expect(parsed?.view).toBe('table');
    expect(parsed?.visibleColumns).toEqual(['number', 'subject', 'status']);
  });
});

describe('normalizePurchaseRequestListColumns', () => {
  it('always keeps number and subject', () => {
    expect(normalizePurchaseRequestListColumns(['status'])).toEqual(['number', 'subject', 'status']);
  });
});
