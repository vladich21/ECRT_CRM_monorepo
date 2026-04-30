import type { PatentGrantRegionKey } from './patentGrantRegions';
import type { PatentListSortBy } from './patentApi';

export type PatentsListServerFilters = {
  search: string;
  departmentId?: string | null;
  statusId?: string | null;
  authorIds: string[];
  areaIds: string[];
  responsibleId?: string | null;
  registrationYears: number[];
  registrationCirYears: number[];
  projectId?: string | null;
  contractId?: string | null;
  grantRegionKeys: PatentGrantRegionKey[];
  sortBy: PatentListSortBy;
  sortOrder: 'asc' | 'desc';
};
