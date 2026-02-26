import { PatentGrant } from '../../types/patent';
import { apiClient } from '../clients';

export const patentGrantsApi = {
  getPatentGrants: async (patentId?: string): Promise<PatentGrant[]> => {
    const response = await apiClient.get(
      patentId ? `/patents/${patentId}/grants` : '/patent_grants',
    );
    return response.data;
  },

  getPatentGrantById: async (grantId: string): Promise<PatentGrant> => {
    const response = await apiClient.get(`/patent_grants/${grantId}`);
    return response.data[0];
  },

  createPatentGrant: async (patentId: string, data: Omit<PatentGrant, 'id' | 'patent_id' | 'created_at' | 'updated_at'>): Promise<PatentGrant> => {
    const response = await apiClient.post(`/patents/${patentId}/grants`, data);
    return response.data[0];
  },

  updatePatentGrant: async (grantId: string, data: Partial<PatentGrant>): Promise<PatentGrant> => {
    const response = await apiClient.put(`/patent_grants/${grantId}`, data);
    return response.data[0];
  },

  deletePatentGrant: async (grantId: string): Promise<void> => {
    const response = await apiClient.delete(`/patent_grants/${grantId}`);
    return response.data;
  },
};
