import { PartnerCategory } from '../../types/partner';
import { apiClient } from '../clients';

export const partnerCategoryApi = {
  getPartnerCategories: async (preview?: number): Promise<PartnerCategory[]> => {
    const response = await apiClient.get('/partner-categories', {
      params: { preview },
    });
    return response.data;
  },

  getPartnerCategoryById: async (categoryId: string): Promise<PartnerCategory> => {
    const response = await apiClient.get(`/partner-categories/${categoryId}`);
    return response.data[0];
  },

  addPartnerCategory: async (data: PartnerCategory): Promise<PartnerCategory> => {
    const response = await apiClient.post(`/partner-categories`, data);
    return response.data[0];
  },

  editPartnerCategory: async (categoryId: string, data: Partial<PartnerCategory>): Promise<PartnerCategory> => {
    const response = await apiClient.put(`/partner-categories/${categoryId}`, data);
    return response.data[0];
  },

  deletePartnerCategory: async (categoryId: string): Promise<PartnerCategory> => {
    const response = await apiClient.delete(`/partner-categories/${categoryId}`);
    return response.data;
  },
};
