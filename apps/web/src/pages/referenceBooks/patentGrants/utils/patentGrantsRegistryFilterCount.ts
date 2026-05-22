import type { PatentGrantsRegistryAdvancedFilters } from '../../../../api/patents/patentGrantsRegistryFilters.types';

export function countPatentGrantsRegistryFilters(filters: PatentGrantsRegistryAdvancedFilters): number {
  let n = 0;
  if (filters.departmentId != null) n += 1;
  if (filters.projectId != null) n += 1;
  if (filters.contractId != null) n += 1;
  if (filters.statusId != null) n += 1;
  if (filters.responsibleId != null) n += 1;
  if (filters.authorIds.length > 0) n += 1;
  if (filters.areaIds.length > 0) n += 1;
  if (filters.registrationYears.length > 0) n += 1;
  if (filters.registrationCirYears.length > 0) n += 1;
  if (filters.grantStatuses.length > 0) n += 1;
  if (filters.grantRegionKeys.length > 0) n += 1;
  if (filters.grantIssueYears.length > 0) n += 1;
  if (filters.grantRenewalYears.length > 0) n += 1;
  return n;
}
