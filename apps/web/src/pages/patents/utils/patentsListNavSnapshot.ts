import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '../../../utils/listNavSnapshotShared';

import { isPatentGrantRegionKey } from '../../../api/patents/patentGrantRegions';

import { DEFAULT_PATENT_FILTERS, type PatentAdvancedFilters, type PatentFilterTab } from '../PatentsListPage.types';

const TABS: PatentFilterTab[] = ['all', 'active', 'deleted'];
function isPatentTab(candidate: unknown): candidate is PatentFilterTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
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
    applied: {
      ...applied,
      authorIds: [...applied.authorIds],
      areaIds: [...applied.areaIds],
      registrationYears: [...applied.registrationYears],
      registrationCirYears: [...applied.registrationCirYears],
      grantRegionKeys: [...applied.grantRegionKeys],
    },
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
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize } = parseListNavSnapshotBase(body, 50);
  const snapshotRecord = body as unknown as PatentsListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  const parsed: PatentAdvancedFilters = {
    departmentId: typeof appliedSnapshot?.departmentId === 'string' ? appliedSnapshot.departmentId : null,
    statusId: typeof appliedSnapshot?.statusId === 'string' ? appliedSnapshot.statusId : null,
    authorIds: Array.isArray(appliedSnapshot?.authorIds)
      ? appliedSnapshot.authorIds.filter((id): id is string => typeof id === 'string')
      : [],
    areaIds: Array.isArray(appliedSnapshot?.areaIds)
      ? appliedSnapshot.areaIds.filter((id): id is string => typeof id === 'string')
      : [],
    responsibleId: typeof appliedSnapshot?.responsibleId === 'string' ? appliedSnapshot.responsibleId : null,
    registrationYears: Array.isArray(appliedSnapshot?.registrationYears)
      ? appliedSnapshot.registrationYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
      : [],
    registrationCirYears: Array.isArray(appliedSnapshot?.registrationCirYears)
      ? appliedSnapshot.registrationCirYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
      : [],
    projectId: typeof appliedSnapshot?.projectId === 'string' ? appliedSnapshot.projectId : null,
    contractId: typeof appliedSnapshot?.contractId === 'string' ? appliedSnapshot.contractId : null,
    grantRegionKeys: Array.isArray(appliedSnapshot?.grantRegionKeys)
      ? appliedSnapshot.grantRegionKeys.filter(isPatentGrantRegionKey)
      : [],
  };
  return {
    searchQuery,
    activeTab: isPatentTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters: { ...DEFAULT_PATENT_FILTERS, ...parsed },
    page,
    pageSize,
  };
}
