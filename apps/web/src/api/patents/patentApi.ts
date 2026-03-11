import { Patent } from '../../types/patent';
import { apiClient } from '../clients';

export interface PatentsListResponse {
  data: Patent[];
  total: number;
}

export const patentApi = {
  getPatents: async (
    is_deleted?: boolean,
    preview?: boolean,
    limit?: number,
    offset?: number,
  ): Promise<Patent[] | PatentsListResponse> => {
    const path = is_deleted ? '/patents/deleted' : '/patents';
    const params: Record<string, string | number> = {};
    if (preview) params.preview = '1';
    if (limit != null) params.limit = limit;
    if (offset != null) params.offset = offset;
    const response = await apiClient.get(path, { params });
    return response.data;
  },

  getPatentById: async (id: string): Promise<Patent> => {
    const response = await apiClient.get(`/patents/${id}`);
    return response.data[0];
  },

  createPatent: async (
    patent: Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>,
  ): Promise<Patent> => {
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
