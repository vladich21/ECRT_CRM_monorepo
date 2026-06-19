import type { PatentGrantRegistryListScope } from '@/api/patents/patentGrantsApi';
import type {
  PatentGrantsRegistryAdvancedFilters,
  PatentGrantsRegistrySortBy,
} from '@/api/patents/patentGrantsRegistryFilters.types';

export function buildPatentGrantsRegistryFiltersResetKey(
  filters: PatentGrantsRegistryAdvancedFilters,
): string {
  return JSON.stringify({
    departmentId: filters.departmentId,
    projectId: filters.projectId,
    contractId: filters.contractId,
    statusId: filters.statusId,
    responsibleId: filters.responsibleId,
    authorIds: [...filters.authorIds].sort(),
    areaIds: [...filters.areaIds].sort(),
    registrationYears: [...filters.registrationYears].sort((a, b) => a - b),
    registrationCirYears: [...filters.registrationCirYears].sort((a, b) => a - b),
    grantStatuses: [...filters.grantStatuses].sort(),
    grantRegionKeys: [...filters.grantRegionKeys].sort(),
    grantIssueYears: [...filters.grantIssueYears].sort((a, b) => a - b),
    grantRenewalYears: [...filters.grantRenewalYears].sort((a, b) => a - b),
  });
}

export function buildPatentGrantsRegistryQueryResetKey(params: {
  debouncedSearch: string;
  grantScopeTab: PatentGrantRegistryListScope;
  appliedFilters: PatentGrantsRegistryAdvancedFilters;
  sortBy: PatentGrantsRegistrySortBy;
  sortOrder: 'asc' | 'desc';
}): string {
  return JSON.stringify({
    search: params.debouncedSearch.trim(),
    tab: params.grantScopeTab,
    filters: buildPatentGrantsRegistryFiltersResetKey(params.appliedFilters),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
}
