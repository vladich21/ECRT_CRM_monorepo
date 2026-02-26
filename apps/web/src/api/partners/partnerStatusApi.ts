import { PartnerStatus } from '../../types/partner';
import { apiClient } from '../clients';

export const partnerStatusApi = {
  getPartnerStatuses: async (preview?: number): Promise<PartnerStatus[]> => {
    const response = await apiClient.get('/partner-statuses', {
      params: { preview },
    });
    return response.data;
  },

  getPartnerStatusById: async (partnerStatusesId: string): Promise<PartnerStatus> => {
    const response = await apiClient.get(`/partner-statuses/${partnerStatusesId}`);
    return response.data[0];
  },

  addPartnerStatus: async (data: PartnerStatus): Promise<PartnerStatus> => {
    const response = await apiClient.post(`/partner-statuses`, data);
    return response.data[0];
  },

  editPartnerStatus: async (partnerStatusesId: string, data: Partial<PartnerStatus>): Promise<PartnerStatus> => {
    const response = await apiClient.put(`/partner-statuses/${partnerStatusesId}`, data);
    return response.data[0];
  },

  deletePartnerStatus: async (partnerStatusesId: string): Promise<PartnerStatus> => {
    const response = await apiClient.delete(`/partner-statuses/${partnerStatusesId}`);
    return response.data;
  },
};
