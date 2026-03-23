import { Partner } from '../../types/partner';
import { apiClient } from '../clients';

export type PartnersTabCounts = {
  all: number;
  ready: number;
  in_progress: number;
};

export interface PartnersListResponse {
  data: Partner[];
  total: number;
  tab_counts: PartnersTabCounts;
}

export interface PartnerListParams {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: 'all' | 'ready' | 'in_progress';
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
        search: filters?.search || undefined,
        type_ids: filters?.typeIds?.length ? filters.typeIds.join(',') : undefined,
        status_ids: filters?.statusIds?.length ? filters.statusIds.join(',') : undefined,
        competence_ids: filters?.competenceIds?.length ? filters.competenceIds.join(',') : undefined,
        readiness:
          filters?.readiness && filters.readiness !== 'all' ? filters.readiness : undefined,
      },
    });
    const responseBody = response.data as PartnersListResponse & {
      tab_counts?: PartnersTabCounts & { key_supplier?: number };
    };
    const tabCountsFromApi = responseBody.tab_counts;
    return {
      ...responseBody,
      tab_counts: {
        all: tabCountsFromApi?.all ?? 0,
        ready: tabCountsFromApi?.ready ?? 0,
        in_progress: tabCountsFromApi?.in_progress ?? 0,
      },
    };
  },

  getPartnersForReference: async (): Promise<Partner[]> => {
    const response = await apiClient.get('/partners', { params: { preview: 1 } });
    return response.data.data ?? response.data;
  },

  getPartnerById: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.get(`/partners/${partnerId}`);
    return response.data[0];
  },

  /** Данные контрагента по ИНН через бэкенд-прокси (секрет DataNewton только на сервере). */
  getPartnerDataByInn: async (partnerInn: string): Promise<Partner> => {
    const response = await apiClient.get('/partners/inn-lookup', {
      params: { inn: partnerInn },
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
