import dayjs, { type Dayjs } from 'dayjs';

import {
  makeListReturnSnapshot,
  readListReturnSnapshot,
  type ListReturnSnapshot,
} from '@/utils/listNavSnapshotShared';

import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';

const TABS: FilterTab[] = ['all', 'active', 'draft', 'inactive', 'deleted'];
function isFilterTab(candidate: unknown): candidate is FilterTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}

type ContractsAppliedSnapshot = {
  partnerId: string | null;
  categoryId: string | null;
  stateId: string | null;
  dateRange: [string, string] | null;
  amountMin: number | null;
  amountMax: number | null;
};

export type ContractsListNavSnapshot = ListReturnSnapshot<FilterTab, ContractsAppliedSnapshot>;

export function buildContractsListNavSnapshot(
  searchQuery: string,
  activeTab: FilterTab,
  applied: AdvancedFilters,
  page: number,
  pageSize: number,
  scrollY?: number,
): ContractsListNavSnapshot {
  return makeListReturnSnapshot({
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
    scrollY,
  });
}

export function parseContractsListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: FilterTab;
  appliedFilters: AdvancedFilters;
  page: number;
  pageSize: number;
  scrollY?: number;
} | null {
  const parsed = readListReturnSnapshot(raw, {
    defaultTab: 'all',
    defaultPageSize: 20,
    isTab: isFilterTab,
    readApplied: rawApplied => {
      const a = rawApplied && typeof rawApplied === 'object' ? (rawApplied as Record<string, unknown>) : {};
      const dr = a.dateRange;
      const dateRange =
        Array.isArray(dr) && dr.length === 2 && typeof dr[0] === 'string' && typeof dr[1] === 'string'
          ? ([dr[0], dr[1]] as [string, string])
          : null;
      return {
        partnerId: typeof a.partnerId === 'string' ? a.partnerId : null,
        categoryId: typeof a.categoryId === 'string' ? a.categoryId : null,
        stateId: typeof a.stateId === 'string' ? a.stateId : null,
        dateRange,
        amountMin: typeof a.amountMin === 'number' ? a.amountMin : null,
        amountMax: typeof a.amountMax === 'number' ? a.amountMax : null,
      };
    },
  });
  if (!parsed) return null;

  const s = parsed.appliedFilters;
  const dateRangeForForm =
    s.dateRange?.[0] && s.dateRange?.[1]
      ? ([dayjs(s.dateRange[0]), dayjs(s.dateRange[1])] as [Dayjs, Dayjs])
      : null;

  return {
    searchQuery: parsed.searchQuery,
    activeTab: parsed.activeTab,
    appliedFilters: {
      partnerId: s.partnerId,
      categoryId: s.categoryId,
      stateId: s.stateId,
      dateRange: dateRangeForForm,
      amountMin: s.amountMin,
      amountMax: s.amountMax,
    },
    page: parsed.page,
    pageSize: parsed.pageSize,
    scrollY: parsed.scrollY,
  };
}
