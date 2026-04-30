import { Patent } from '../../types/patent';
import { apiClient } from '../clients';

export type PatentsTabCounts = {
  active: number;
  deleted: number;
  all: number;
};

export interface PatentsListResponse {
  data: Patent[];
  total: number;
  tab_counts: PatentsTabCounts;
}

export type PatentListSortBy =
  | 'registration_number'
  | 'registration_date'
  | 'registration_date_cir'
  | 'created_at';

export interface PatentListQuery {
  preview?: boolean;
  deletedScope?: 'active' | 'deleted' | 'all';
  limit?: number;
  offset?: number;
  search?: string;
  department_id?: string;
  status_id?: string;
  author_ids?: string[];
  area_ids?: string[];
  responsible_for_patenting_id?: string;
  /** Годы по registration_date (ИЦ ЖТ), через запятую */
  registration_years?: string;
  registration_cir_years?: string;
  project_id?: string;
  contract_id?: string;
  /** Ключи регионов выдачи (patent_grants.office), через запятую */
  grant_regions?: string;
  sort_by?: PatentListSortBy;
  sort_order?: 'asc' | 'desc';
}

function buildPatentsQueryParams(q: PatentListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (q.preview) params.preview = '1';
  params.deleted_scope = q.deletedScope ?? 'active';
  if (q.limit != null) params.limit = q.limit;
  if (q.offset != null) params.offset = q.offset;
  if (q.search?.trim()) params.search = q.search.trim();
  if (q.department_id) params.department_id = q.department_id;
  if (q.status_id) params.status_id = q.status_id;
  if (q.author_ids?.length) params.author_ids = q.author_ids.join(',');
  if (q.area_ids?.length) params.area_ids = q.area_ids.join(',');
  if (q.responsible_for_patenting_id) params.responsible_for_patenting_id = q.responsible_for_patenting_id;
  if (q.registration_years?.trim()) params.registration_years = q.registration_years.trim();
  if (q.registration_cir_years?.trim()) params.registration_cir_years = q.registration_cir_years.trim();
  if (q.project_id) params.project_id = q.project_id;
  if (q.contract_id) params.contract_id = q.contract_id;
  if (q.grant_regions?.trim()) params.grant_regions = q.grant_regions.trim();
  if (q.sort_by && !q.preview) params.sort_by = q.sort_by;
  if (q.sort_order && !q.preview) params.sort_order = q.sort_order;
  return params;
}

export const patentApi = {
  getLinkedContractIds: async (deletedScope: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/patents/filter/linked-contract-ids', {
      params: { deleted_scope: deletedScope },
    });
    return response.data;
  },
  getPatents: async (query: PatentListQuery = {}): Promise<Patent[] | PatentsListResponse> => {
    const params = buildPatentsQueryParams({
      ...query,
      deletedScope: query.deletedScope ?? 'active',
    });
    const response = await apiClient.get<Patent[] | PatentsListResponse>('/patents', { params });
    return response.data;
  },
  getPatentById: async (id: string): Promise<Patent> => {
    const response = await apiClient.get(`/patents/${id}`);
    return response.data[0];
  },
  createPatent: async (patent: Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): Promise<Patent> => {
    const response = await apiClient.post('/patents', patent);
    return response.data[0];
  },
  updatePatent: async (id: string, patent: Partial<Patent>): Promise<Patent> => {
    const response = await apiClient.put(`/patents/${id}`, patent);
    return response.data[0];
  },
  restorePatent: async (id: string): Promise<Patent> => {
    const response = await apiClient.put(`/patents/${id}/restore`);
    return response.data[0];
  },
  deletePatent: async (id: string): Promise<void> => {
    await apiClient.delete(`/patents/${id}`);
  },
};
