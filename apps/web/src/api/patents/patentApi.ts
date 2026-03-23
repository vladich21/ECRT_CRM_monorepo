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

export interface PatentListQuery {
  preview?: boolean;
  deletedScope?: 'active' | 'deleted' | 'all';
  limit?: number;
  offset?: number;
  search?: string;
  department_id?: string;
  status_id?: string;
  author_ids?: string[];
  created_by?: string;
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
  if (q.created_by) params.created_by = q.created_by;
  return params;
}

export const patentApi = {
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
