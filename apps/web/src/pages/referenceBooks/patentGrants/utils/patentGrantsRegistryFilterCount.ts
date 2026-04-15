import type { PatentGrantsRegistryAdvancedFilters } from '../../../../api/patents/patentGrantsRegistryFilters.types';

export function countPatentGrantsRegistryFilters(filters: PatentGrantsRegistryAdvancedFilters): number {
  let n = 0;
  if (filters.grantStatuses.length > 0) n += 1;
  if (filters.grantRegionKeys.length > 0) n += 1;
  if (filters.grantIssueYears.length > 0) n += 1;
  if (filters.grantRenewalYears.length > 0) n += 1;
  return n;
}
