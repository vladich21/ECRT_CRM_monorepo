import { isPatentGrantRegionKey } from '@/api/patents/patentGrantRegions';
import {
  makeListReturnSnapshot,
  readListReturnSnapshot,
  type ListReturnSnapshot,
} from '@/utils/listNavSnapshotShared';

import {
  DEFAULT_PATENT_FILTERS,
  type PatentAdvancedFilters,
  type PatentFilterTab,
} from '../types/PatentsListPage.types';

const TABS: PatentFilterTab[] = ['all', 'deleted'];
function isPatentTab(candidate: unknown): candidate is PatentFilterTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}

export type PatentsListNavSnapshot = ListReturnSnapshot<PatentFilterTab, PatentAdvancedFilters>;

export function buildPatentsListNavSnapshot(
  searchQuery: string,
  activeTab: PatentFilterTab,
  applied: PatentAdvancedFilters,
  page: number,
  pageSize: number,
): PatentsListNavSnapshot {
  return makeListReturnSnapshot({
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
  });
}

export function parsePatentsListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: PatentFilterTab;
  appliedFilters: PatentAdvancedFilters;
  page: number;
  pageSize: number;
} | null {
  const parsed = readListReturnSnapshot(raw, {
    defaultTab: 'all',
    defaultPageSize: 50,
    isTab: isPatentTab,
    readApplied: rawApplied => {
      const a = rawApplied && typeof rawApplied === 'object' ? (rawApplied as Record<string, unknown>) : {};
      return {
        departmentId: typeof a.departmentId === 'string' ? a.departmentId : null,
        statusId: typeof a.statusId === 'string' ? a.statusId : null,
        authorIds: Array.isArray(a.authorIds) ? a.authorIds.filter((id): id is string => typeof id === 'string') : [],
        areaIds: Array.isArray(a.areaIds) ? a.areaIds.filter((id): id is string => typeof id === 'string') : [],
        responsibleId: typeof a.responsibleId === 'string' ? a.responsibleId : null,
        registrationYears: Array.isArray(a.registrationYears)
          ? a.registrationYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
          : [],
        registrationCirYears: Array.isArray(a.registrationCirYears)
          ? a.registrationCirYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
          : [],
        projectId: typeof a.projectId === 'string' ? a.projectId : null,
        contractId: typeof a.contractId === 'string' ? a.contractId : null,
        grantRegionKeys: Array.isArray(a.grantRegionKeys) ? a.grantRegionKeys.filter(isPatentGrantRegionKey) : [],
      };
    },
  });
  if (!parsed) return null;

  const rawActiveTab = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).activeTab : undefined;
  return {
    ...parsed,
    activeTab: rawActiveTab === 'active' ? 'all' : parsed.activeTab,
    appliedFilters: { ...DEFAULT_PATENT_FILTERS, ...parsed.appliedFilters },
  };
}
