import { PartnerCompetence } from '../../types/partner';
import { apiClient } from '../clients';

export const partnerCompetenceApi = {
  getPartnerCompetencies: async (preview?: number): Promise<PartnerCompetence[]> => {
    const response = await apiClient.get('/partner-competencies', {
      params: { preview },
    });
    return response.data;
  },

  getPartnerCompetenceById: async (partnerCompetenciesId: string): Promise<PartnerCompetence> => {
    const response = await apiClient.get(`/partner-competencies/${partnerCompetenciesId}`);
    return response.data[0];
  },

  addPartnerCompetence: async (data: PartnerCompetence): Promise<PartnerCompetence> => {
    const response = await apiClient.post(`/partner-competencies`, data);
    return response.data[0];
  },

  editPartnerCompetence: async (
    partnerCompetenciesId: string,
    data: Partial<PartnerCompetence>,
  ): Promise<PartnerCompetence> => {
    const response = await apiClient.put(`/partner-competencies/${partnerCompetenciesId}`, data);
    return response.data[0];
  },

  deletePartnerCompetence: async (partnerCompetenciesId: string): Promise<PartnerCompetence> => {
    const response = await apiClient.delete(`/partner-competencies/${partnerCompetenciesId}`);
    return response.data;
  },
};
