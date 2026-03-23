import type { PatentAdvancedFilters, PatentFilterTab } from '../PatentsListPage.types';
import { DEFAULT_PATENT_FILTERS } from '../PatentsListPage.types';
const TABS: PatentFilterTab[] = ['all', 'active', 'deleted'];
function isPatentTab(candidate: unknown): candidate is PatentFilterTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}

function snapshotFormatVersion(raw: object): number | undefined {
  const record = raw as Record<string, unknown>;
  if (typeof record.version === 'number') return record.version;
  if (typeof record.v === 'number') return record.v;
  return undefined;
}

export type PatentsListNavSnapshot = {
  version: 1;
  searchQuery: string;
  activeTab: PatentFilterTab;
  applied: PatentAdvancedFilters;
  page: number;
  pageSize: number;
};
export function buildPatentsListNavSnapshot(
  searchQuery: string,
  activeTab: PatentFilterTab,
  applied: PatentAdvancedFilters,
  page: number,
  pageSize: number,
): PatentsListNavSnapshot {
  return {
    version: 1,
    searchQuery,
    activeTab,
    applied: { ...applied, authorIds: [...applied.authorIds] },
    page,
    pageSize,
  };
}
export function parsePatentsListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: PatentFilterTab;
  appliedFilters: PatentAdvancedFilters;
  page: number;
  pageSize: number;
} | null {
  if (!raw || typeof raw !== 'object' || snapshotFormatVersion(raw) !== 1) return null;
  const snapshotRecord = raw as PatentsListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  const page = typeof snapshotRecord.page === 'number' && snapshotRecord.page >= 1 ? snapshotRecord.page : 1;
  const pageSize =
    typeof snapshotRecord.pageSize === 'number' && snapshotRecord.pageSize >= 1 ? snapshotRecord.pageSize : 50;
  return {
    searchQuery: typeof snapshotRecord.searchQuery === 'string' ? snapshotRecord.searchQuery : '',
    activeTab: isPatentTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters: {
      departmentId: typeof appliedSnapshot?.departmentId === 'string' ? appliedSnapshot.departmentId : null,
      statusId: typeof appliedSnapshot?.statusId === 'string' ? appliedSnapshot.statusId : null,
      authorIds: Array.isArray(appliedSnapshot?.authorIds)
        ? appliedSnapshot.authorIds.filter((id): id is string => typeof id === 'string')
        : [],
      responsibleId: typeof appliedSnapshot?.responsibleId === 'string' ? appliedSnapshot.responsibleId : null,
    },
    page,
    pageSize,
  };
}
