import { parsePagination, type PaginationParams } from '../../common/pagination';
import { parseDeletedScope, type DeletedScope } from '../../common/deleted-scope';
import { parsePatentGrantRegionKeys } from './patent-grant-region-filter';
import type { PatentFindAllParams, PatentListSortBy } from './services/patents.service';

export type PatentListHttpQuery = {
  preview?: string;
  deleted_scope?: string;
  search?: string;
  department_id?: string;
  status_id?: string;
  author_ids?: string;
  area_ids?: string;
  responsible_for_patenting_id?: string;
  registration_years?: string;
  registration_cir_years?: string;
  project_id?: string;
  contract_id?: string;
  grant_regions?: string;
  limit?: string;
  offset?: string;
  sort_by?: string;
  sort_order?: string;
};

function parseAuthorIds(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseRegistrationYears(raw?: string): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((y) => Number.isInteger(y) && y >= 1900 && y <= 2100);
}

function parsePatentListSortBy(raw?: string): PatentListSortBy | undefined {
  if (
    raw === 'created_at' ||
    raw === 'registration_date' ||
    raw === 'registration_date_cir' ||
    raw === 'registration_number' ||
    raw === 'patent_status'
  ) {
    return raw;
  }
  return undefined;
}

function parsePatentListSortOrder(raw?: string): 'asc' | 'desc' | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === 'asc' || v === 'desc') return v;
  return undefined;
}

export type PatentExportParams = Omit<PatentFindAllParams, 'preview' | 'pagination'>;

type ParsePatentListOptions = {
  deletedScope?: DeletedScope;
  includePagination?: boolean;
};

export function parsePatentListQuery(
  query: PatentListHttpQuery,
  options: ParsePatentListOptions & { includePagination: true },
): PatentFindAllParams;
export function parsePatentListQuery(
  query: PatentListHttpQuery,
  options?: ParsePatentListOptions & { includePagination?: false },
): PatentExportParams;
export function parsePatentListQuery(
  query: PatentListHttpQuery,
  options: ParsePatentListOptions = {},
): PatentFindAllParams | PatentExportParams {
  const registrationYears = parseRegistrationYears(query.registration_years);
  const registrationCirYears = parseRegistrationYears(query.registration_cir_years);
  const grantRegionKeys = parsePatentGrantRegionKeys(query.grant_regions);
  const sortBy = parsePatentListSortBy(query.sort_by);
  const sortOrder = parsePatentListSortOrder(query.sort_order);

  const base = {
    deletedScope: options.deletedScope ?? parseDeletedScope(query.deleted_scope),
    search: query.search?.trim() || undefined,
    departmentId: query.department_id?.trim() || undefined,
    statusId: query.status_id?.trim() || undefined,
    authorIds: parseAuthorIds(query.author_ids),
    areaIds: parseAuthorIds(query.area_ids),
    responsibleForPatentingId: query.responsible_for_patenting_id?.trim() || undefined,
    registrationYears: registrationYears.length > 0 ? registrationYears : undefined,
    registrationCirYears: registrationCirYears.length > 0 ? registrationCirYears : undefined,
    projectId: query.project_id?.trim() || undefined,
    contractId: query.contract_id?.trim() || undefined,
    grantRegionKeys: grantRegionKeys.length > 0 ? grantRegionKeys : undefined,
    ...(sortBy ? { sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {}),
  };

  if (options.includePagination) {
    return {
      preview: query.preview === '1',
      pagination: parsePagination(query.limit, query.offset) as PaginationParams,
      ...base,
    };
  }

  return base;
}
