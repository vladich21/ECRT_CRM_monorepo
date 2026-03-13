import axios from 'axios';
import { Partner } from '../../types/partner';
import { apiClient } from '../clients';

const GLOBAL_INN_URL = 'https://api.datanewton.ru/v1/counterparty';
const INN_PARAMS = {
  key: '***REDACTED***',
  filters: 'OKVED_BLOCK,NEGATIVE_LISTS_BLOCK,ADDRESS_BLOCK',
};

export interface PartnersListResponse {
  data: Partner[];
  total: number;
}

export interface PartnerListParams {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
}

export const partnerApi = {
  getPartners: async (
    filters?: PartnerListParams,
    limit = 20,
    offset = 0,
  ): Promise<PartnersListResponse> => {
    const response = await apiClient.get('/partners', {
      params: {
        limit,
        offset,
        search:         filters?.search || undefined,
        // comma-separated — backend splits them
        type_ids:        filters?.typeIds?.length        ? filters.typeIds.join(',')        : undefined,
        status_ids:      filters?.statusIds?.length      ? filters.statusIds.join(',')      : undefined,
        competence_ids:  filters?.competenceIds?.length  ? filters.competenceIds.join(',')  : undefined,
      },
    });
    return response.data;
  },

  /** Все партнёры для справочников (выпадающие списки) */
  getPartnersForReference: async (): Promise<Partner[]> => {
    const response = await apiClient.get('/partners', { params: { preview: 1 } });
    return response.data.data ?? response.data;
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
    const response = await apiClient.post('/partners', data);
    if (Array.isArray(response.data)) {
      if (response.data[0]?.error) throw new Error(response.data[0].error.msg);
    } else if (response.data?.error) {
      throw new Error(response.data.error.msg);
    } else if (typeof response.data === 'string' && response.data.includes('error')) {
      throw new Error(response.data);
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
