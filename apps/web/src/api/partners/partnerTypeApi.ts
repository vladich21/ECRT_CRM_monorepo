import { PartnerType } from '../../types/partner';
import { apiClient } from '../clients';

export const partnerTypeApi = {
  getPartnerTypes: async (preview?: number): Promise<PartnerType[]> => {
    const response = await apiClient.get('/partner-types', {
      params: { preview },
    });
    return response.data;
  },

  getPartnerTypeById: async (userId: string): Promise<PartnerType> => {
    const response = await apiClient.get(`/partner-types/${userId}`);
    return response.data[0];
  },

  addPartnerType: async (data: PartnerType): Promise<PartnerType> => {
    const response = await apiClient.post('/partner-types', data);
    return response.data[0];
  },

  editPartnerType: async (userId: string, data: Partial<PartnerType>): Promise<PartnerType> => {
    const response = await apiClient.put(`/partner-types/${userId}`, data);
    return response.data[0];
  },

  deletePartnerType: async (userId: string): Promise<PartnerType> => {
    const response = await apiClient.delete(`/partner-types/${userId}`);
    return response.data;
  },
};
