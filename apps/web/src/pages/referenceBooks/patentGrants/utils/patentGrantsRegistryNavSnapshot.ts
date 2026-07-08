import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import { isPatentGrantRegionKey } from '@/api/patents/patentGrantRegions';
import {
  DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  type PatentGrantsRegistryAdvancedFilters,
  type PatentGrantsRegistrySortBy,
} from '@/api/patents/patentGrantsRegistryFilters.types';
import { readListReturnSnapshot, makeListReturnSnapshot } from '@/utils/listNavSnapshotShared';

const SCOPES: PatentGrantRegistryListScope[] = ['all', 'active', 'other'];

const DEFAULT_SORT_BY: PatentGrantsRegistrySortBy = 'patent_registration_number';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

function isGrantRegistryScope(candidate: unknown): candidate is PatentGrantRegistryListScope {
  return typeof candidate === 'string' && (SCOPES as string[]).includes(candidate);
}

function isGrantRegistrySortBy(candidate: unknown): candidate is PatentGrantsRegistrySortBy {
  return (
    candidate === 'patent_registration_number' ||
    candidate === 'grant_date' ||
    candidate === 'grant_number' ||
    candidate === 'created_at'
  );
}

function readGrantApplied(rawApplied: unknown): PatentGrantsRegistryAdvancedFilters {
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
    grantStatuses: Array.isArray(a.grantStatuses)
      ? a.grantStatuses.filter((s): s is string => typeof s === 'string')
      : [],
    grantRegionKeys: Array.isArray(a.grantRegionKeys) ? a.grantRegionKeys.filter(isPatentGrantRegionKey) : [],
    grantIssueYears: Array.isArray(a.grantIssueYears)
      ? a.grantIssueYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
      : [],
    grantRenewalYears: Array.isArray(a.grantRenewalYears)
      ? a.grantRenewalYears.filter((y): y is number => typeof y === 'number' && Number.isInteger(y))
      : [],
  };
}

export function serializePatentGrantsRegistryPersistedUi(
  searchQuery: string,
  grantScopeTab: PatentGrantRegistryListScope,
  applied: PatentGrantsRegistryAdvancedFilters,
  page: number,
  pageSize: number,
  sortBy: PatentGrantsRegistrySortBy,
  sortOrder: 'asc' | 'desc',
) {
  return {
    ...makeListReturnSnapshot({
      searchQuery,
      activeTab: grantScopeTab,
      applied: readGrantApplied(applied),
      page,
      pageSize,
    }),
    sortBy,
    sortOrder,
  };
}

export function parsePatentGrantsRegistryPersistedUi(raw: unknown): {
  searchQuery: string;
  grantScopeTab: PatentGrantRegistryListScope;
  appliedFilters: PatentGrantsRegistryAdvancedFilters;
  page: number;
  pageSize: number;
  sortBy: PatentGrantsRegistrySortBy;
  sortOrder: 'asc' | 'desc';
} | null {
  const parsed = readListReturnSnapshot(raw, {
    defaultTab: 'all',
    defaultPageSize: 50,
    isTab: isGrantRegistryScope,
    readApplied: readGrantApplied,
  });
  if (!parsed) return null;

  const rawRecord = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sortBy = isGrantRegistrySortBy(rawRecord.sortBy) ? rawRecord.sortBy : DEFAULT_SORT_BY;
  const sortOrder = rawRecord.sortOrder === 'desc' ? 'desc' : DEFAULT_SORT_ORDER;

  return {
    searchQuery: parsed.searchQuery,
    grantScopeTab: parsed.activeTab,
    appliedFilters: { ...DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS, ...parsed.appliedFilters },
    page: parsed.page,
    pageSize: parsed.pageSize,
    sortBy,
    sortOrder,
  };
}
