import axios from 'axios';
import { Partner } from '../../types/partner';
import { apiClient } from '../clients';

const GLOBAL_INN_URL = 'https://api.datanewton.ru/v1/counterparty';

const INN_PARAMS = {
  key: '***REDACTED***',
  filters: 'OKVED_BLOCK,NEGATIVE_LISTS_BLOCK,ADDRESS_BLOCK',
};

export const partnerApi = {
  getPartners: async (preview?: number): Promise<Partner[]> => {
    const response = await apiClient.get('/partners', {
      params: { preview },
    });
    return response.data;
  },

  getPartnerById: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.get(`/partners/${partnerId}`);
    return response.data[0];
  },

  getPartnerDataByInn: async (partnerInn: string): Promise<Partner> => {
    const response = await axios.get(GLOBAL_INN_URL, {
      params: { inn: partnerInn, ...INN_PARAMS },
    });
    return response.data;
  },

addPartner: async (data: Partner): Promise<Partner> => {
  const response = await apiClient.post(`/partners`, data);

  if (Array.isArray(response.data)) {
    if (response.data[0]?.error) {
      const error = new Error(response.data[0].error.msg);
      throw error;
    }
  } else if (response.data?.error) {
    const error = new Error(response.data.error.msg);
    throw error;
  } else if (typeof response.data === 'string' && response.data.includes('error')) {
    const error = new Error(response.data);
    throw error;
  }

  return Array.isArray(response.data) ? response.data[0] : response.data;
},

  editPartner: async (partnerId: string, data: Partial<Partner>): Promise<Partner> => {
    const response = await apiClient.put(`/partners/${partnerId}`, data);
    return response.data[0];
  },

  deletePartner: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.delete(`/partners/${partnerId}`);
    return response.data;
  },
};
