import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import { isPatentGrantRegionKey } from '@/api/patents/patentGrantRegions';
import {
  DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  type PatentGrantsRegistryAdvancedFilters,
} from '@/api/patents/patentGrantsRegistryFilters.types';
import { readListReturnSnapshot, makeListReturnSnapshot } from '@/utils/listNavSnapshotShared';

const SCOPES: PatentGrantRegistryListScope[] = ['all', 'active', 'other'];

function isGrantRegistryScope(candidate: unknown): candidate is PatentGrantRegistryListScope {
  return typeof candidate === 'string' && (SCOPES as string[]).includes(candidate);
}

export function buildPatentGrantsRegistryListSnapshot(
  searchQuery: string,
  grantScopeTab: PatentGrantRegistryListScope,
  applied: PatentGrantsRegistryAdvancedFilters,
  page: number,
  pageSize: number,
) {
  return {
    ...makeListReturnSnapshot({
      searchQuery,
      activeTab: grantScopeTab,
      applied: {
        grantStatuses: [...applied.grantStatuses],
        grantRegionKeys: [...applied.grantRegionKeys],
        grantIssueYears: [...applied.grantIssueYears],
        grantRenewalYears: [...applied.grantRenewalYears],
      },
      page,
      pageSize,
    }),
  };
}

export function parsePatentGrantsRegistryListSnapshot(raw: unknown): {
  searchQuery: string;
  grantScopeTab: PatentGrantRegistryListScope;
  appliedFilters: PatentGrantsRegistryAdvancedFilters;
  page: number;
  pageSize: number;
} | null {
  const parsed = readListReturnSnapshot(raw, {
    defaultTab: 'all',
    defaultPageSize: 50,
    isTab: isGrantRegistryScope,
    readApplied: rawApplied => {
      const a = rawApplied && typeof rawApplied === 'object' ? (rawApplied as Record<string, unknown>) : {};
      return {
        grantStatuses: Array.isArray(a.grantStatuses)
          ? a.grantStatuses.filter((s): s is string => typeof s === 'string')
          : [],
        grantRegionKeys: Array.isArray(a.grantRegionKeys)
          ? a.grantRegionKeys.filter(isPatentGrantRegionKey)
          : [],
        grantIssueYears: Array.isArray(a.grantIssueYears)
          ? a.grantIssueYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
          : [],
        grantRenewalYears: Array.isArray(a.grantRenewalYears)
          ? a.grantRenewalYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
          : [],
      };
    },
  });
  if (!parsed) return null;
  return {
    searchQuery: parsed.searchQuery,
    grantScopeTab: parsed.activeTab,
    appliedFilters: { ...DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS, ...parsed.appliedFilters },
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}
