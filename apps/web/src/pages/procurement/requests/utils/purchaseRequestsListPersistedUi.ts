import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '@/utils/listNavSnapshotShared';

import {
  normalizePurchaseRequestListColumns,
  type PurchaseRequestListColumnKey,
} from '../purchaseRequestListColumns';
import { PURCHASE_REQUEST_LIST_TABS, type PurchaseRequestListTab } from '../purchaseRequestLabels';

const STORAGE_KEY = 'srn.purchaseRequestsList.ui.v1';
const TAB_KEYS = PURCHASE_REQUEST_LIST_TABS.map(tab => tab.key);

function isListTab(candidate: unknown): candidate is PurchaseRequestListTab {
  return typeof candidate === 'string' && (TAB_KEYS as string[]).includes(candidate);
}

function isListView(candidate: unknown): candidate is PurchaseRequestsListView {
  return candidate === 'cards' || candidate === 'table';
}

export type PurchaseRequestsListView = 'cards' | 'table';

export type PurchaseRequestsListPersistedUi = {
  searchQuery: string;
  activeTab: PurchaseRequestListTab;
  page: number;
  pageSize: number;
  view: PurchaseRequestsListView;
  visibleColumns: PurchaseRequestListColumnKey[];
};

export function parsePurchaseRequestsListPersistedUi(raw: unknown): PurchaseRequestsListPersistedUi | null {
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize } = parseListNavSnapshotBase(body, 20);
  return {
    searchQuery,
    activeTab: isListTab(body.activeTab) ? body.activeTab : 'all',
    page,
    pageSize,
    view: isListView(body.view) ? body.view : 'cards',
    visibleColumns: normalizePurchaseRequestListColumns(body.visibleColumns),
  };
}

export function loadPurchaseRequestsListPersistedUi(): PurchaseRequestsListPersistedUi | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePurchaseRequestsListPersistedUi(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function savePurchaseRequestsListPersistedUi(snapshot: PurchaseRequestsListPersistedUi): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...snapshot }));
  } catch {
    /* ignore quota / private mode */
  }
}
