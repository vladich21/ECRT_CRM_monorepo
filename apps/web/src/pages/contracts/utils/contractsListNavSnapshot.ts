import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';
const TABS: FilterTab[] = ['all', 'active', 'draft', 'inactive', 'deleted'];
function isFilterTab(candidate: unknown): candidate is FilterTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}

function snapshotFormatVersion(raw: object): number | undefined {
  const record = raw as Record<string, unknown>;
  if (typeof record.version === 'number') return record.version;
  if (typeof record.v === 'number') return record.v;
  return undefined;
}

export type ContractsListNavSnapshot = {
  version: 1;
  searchQuery: string;
  activeTab: FilterTab;
  applied: {
    partnerId: string | null;
    categoryId: string | null;
    stateId: string | null;
    dateRange: [string, string] | null;
    amountMin: number | null;
    amountMax: number | null;
  };
  page: number;
  pageSize: number;
};
export function buildContractsListNavSnapshot(
  searchQuery: string,
  activeTab: FilterTab,
  applied: AdvancedFilters,
  page: number,
  pageSize: number,
): ContractsListNavSnapshot {
  return {
    version: 1,
    searchQuery,
    activeTab,
    applied: {
      partnerId: applied.partnerId,
      categoryId: applied.categoryId,
      stateId: applied.stateId,
      dateRange:
        applied.dateRange?.[0] && applied.dateRange?.[1]
          ? [applied.dateRange[0].format('YYYY-MM-DD'), applied.dateRange[1].format('YYYY-MM-DD')]
          : null,
      amountMin: applied.amountMin,
      amountMax: applied.amountMax,
    },
    page,
    pageSize,
  };
}
export function parseContractsListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: FilterTab;
  appliedFilters: AdvancedFilters;
  page: number;
  pageSize: number;
} | null {
  if (!raw || typeof raw !== 'object' || snapshotFormatVersion(raw) !== 1) return null;
  const snapshotRecord = raw as ContractsListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  const dateRange =
    appliedSnapshot?.dateRange?.[0] && appliedSnapshot?.dateRange?.[1]
      ? ([dayjs(appliedSnapshot.dateRange[0]), dayjs(appliedSnapshot.dateRange[1])] as [Dayjs, Dayjs])
      : null;
  const page = typeof snapshotRecord.page === 'number' && snapshotRecord.page >= 1 ? snapshotRecord.page : 1;
  const pageSize =
    typeof snapshotRecord.pageSize === 'number' && snapshotRecord.pageSize >= 1 ? snapshotRecord.pageSize : 20;
  return {
    searchQuery: typeof snapshotRecord.searchQuery === 'string' ? snapshotRecord.searchQuery : '',
    activeTab: isFilterTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters: {
      partnerId: typeof appliedSnapshot?.partnerId === 'string' ? appliedSnapshot.partnerId : null,
      categoryId: typeof appliedSnapshot?.categoryId === 'string' ? appliedSnapshot.categoryId : null,
      stateId: typeof appliedSnapshot?.stateId === 'string' ? appliedSnapshot.stateId : null,
      dateRange,
      amountMin: typeof appliedSnapshot?.amountMin === 'number' ? appliedSnapshot.amountMin : null,
      amountMax: typeof appliedSnapshot?.amountMax === 'number' ? appliedSnapshot.amountMax : null,
    },
    page,
    pageSize,
  };
}
