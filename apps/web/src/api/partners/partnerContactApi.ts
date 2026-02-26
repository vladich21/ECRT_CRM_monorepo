import { PartnerContact } from '../../types/partner';
import { apiClient } from '../clients';

export const partnerContactApi = {
  getPartnerContacts: async (partnerId?: string): Promise<PartnerContact[]> => {
    const response = await apiClient.get(`/partners/${partnerId}/contacts`);
    return response.data;
  },

  addPartnerContact: async (partnerId: string, data: PartnerContact): Promise<PartnerContact> => {
    console.log(partnerId, data);
    const response = await apiClient.post(`/partners/${partnerId}/contacts`, data);
    return response.data[0];
  },

  editPartnerContact: async (
    partnerId: string,
    contactId: string,
    data: Partial<PartnerContact>,
  ): Promise<PartnerContact> => {
    const response = await apiClient.put(`/partners/${partnerId}/contacts/${contactId}`, data);
    return response.data[0];
  },

  deletePartnerContact: async (partnerId: string, contactId: string): Promise<PartnerContact> => {
    const response = await apiClient.delete(`/partners/${partnerId}/contacts/${contactId}`);
    return response.data;
  },
};
