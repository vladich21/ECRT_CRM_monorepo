// api/partnerEconomicCategoryApi.ts
import { PartnerEconomicCategory } from '../../types/partner';
import { apiClient } from '../clients';

export const partnerEconomicCategoryApi = {
  getPartnerEconomicCategories: async (): Promise<PartnerEconomicCategory[]> => {
    const response = await apiClient.get('/partner-economic-categories');
    return response.data;
  },

  getPartnerEconomicCategoryById: async (categoryId: string): Promise<PartnerEconomicCategory> => {
    const response = await apiClient.get(`/partner-economic-categories/${categoryId}`);
    return response.data;
  },

  createPartnerEconomicCategory: async (data: PartnerEconomicCategory): Promise<PartnerEconomicCategory> => {
    const response = await apiClient.post('/partner-economic-categories', data);
    return response.data;
  },

  updatePartnerEconomicCategory: async (
    categoryId: string,
    data: Partial<PartnerEconomicCategory>,
  ): Promise<PartnerEconomicCategory> => {
    const response = await apiClient.put(`/partner-economic-categories/${categoryId}`, data);
    return response.data;
  },

  deletePartnerEconomicCategory: async (categoryId: string): Promise<void> => {
    const response = await apiClient.delete(`/partner-economic-categories/${categoryId}`);
    return response.data;
  },
};
