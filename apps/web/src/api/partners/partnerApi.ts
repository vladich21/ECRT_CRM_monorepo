import { Partner } from '../../types/partner';
import { apiClient } from '../clients';
import type { DeletionScope, DeletionTabCounts } from '../../constants/deletionScope';
import { EMPTY_DELETION_TAB_COUNTS } from '../../constants/deletionScope';

export type PartnersTabCounts = {
  all: number;
  ready: number;
  in_progress: number;
  key_supplier: number;
};

export interface PartnersListResponse {
  data: Partner[];
  total: number;
  tab_counts: PartnersTabCounts;
  deletion_tab_counts: DeletionTabCounts;
}

export interface PartnerListParams {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: 'all' | 'ready' | 'in_progress';
  deletedScope?: DeletionScope;
}

export const partnerApi = {
  getPartners: async (filters?: PartnerListParams, limit = 20, offset = 0): Promise<PartnersListResponse> => {
    const response = await apiClient.get('/partners', {
      params: {
        limit,
        offset,
        deleted_scope: filters?.deletedScope ?? 'active',
        search: filters?.search || undefined,
        type_ids: filters?.typeIds?.length ? filters.typeIds.join(',') : undefined,
        status_ids: filters?.statusIds?.length ? filters.statusIds.join(',') : undefined,
        competence_ids: filters?.competenceIds?.length ? filters.competenceIds.join(',') : undefined,
        readiness: filters?.readiness && filters.readiness !== 'all' ? filters.readiness : undefined,
      },
    });
    const responseBody = response.data as PartnersListResponse;
    const tc = responseBody.tab_counts;
    return {
      ...responseBody,
      tab_counts: {
        all: tc?.all ?? 0,
        ready: tc?.ready ?? 0,
        in_progress: tc?.in_progress ?? 0,
        key_supplier: tc?.key_supplier ?? 0,
      },
      deletion_tab_counts: responseBody.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS,
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
    const body = response.data;
    return Array.isArray(body) ? body[0] : body;
  },
  restorePartner: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.put(`/partners/${partnerId}/restore`);
    return response.data[0];
  },
};
