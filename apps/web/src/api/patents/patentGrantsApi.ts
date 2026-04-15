import { PatentGrant } from '../../types/patent';
import { apiClient } from '../clients';
import type { PatentGrantsRegistryServerFilters } from './patentGrantsRegistryFilters.types';

export type PatentGrantRegistryListScope = 'all' | 'active' | 'other';

export type PatentGrantsRegistryListQuery = PatentGrantsRegistryServerFilters & {
  limit: number;
  offset: number;
  listScope: PatentGrantRegistryListScope;
};

function buildRegistryQueryParams(query: PatentGrantsRegistryListQuery): Record<string, string | number | undefined> {
  const grantStatuses = query.grantStatuses ?? [];
  const grantRegionKeys = query.grantRegionKeys ?? [];
  const grantIssueYears = query.grantIssueYears ?? [];
  const grantRenewalYears = query.grantRenewalYears ?? [];
  return {
    limit: query.limit,
    offset: query.offset,
    search: query.search.trim() || undefined,
    list_scope: query.listScope,
    grant_statuses: grantStatuses.length > 0 ? grantStatuses.join(',') : undefined,
    grant_regions: grantRegionKeys.length > 0 ? grantRegionKeys.join(',') : undefined,
    grant_issue_years: grantIssueYears.length > 0 ? grantIssueYears.join(',') : undefined,
    grant_renewal_years: grantRenewalYears.length > 0 ? grantRenewalYears.join(',') : undefined,
  };
}

export type PatentGrantsRegistryResponse = {
  data: PatentGrant[];
  total: number;
  tab_counts: { all: number; active: number; other: number };
};

export const patentGrantsApi = {
  getPatentGrants: async (patentId: string): Promise<PatentGrant[]> => {
    const response = await apiClient.get<PatentGrant[]>(`/patents/${patentId}/grants`);
    return response.data;
  },

  getPatentGrantsRegistry: async (params: PatentGrantsRegistryListQuery): Promise<PatentGrantsRegistryResponse> => {
    const response = await apiClient.get<PatentGrantsRegistryResponse>('/patent_grants', {
      params: buildRegistryQueryParams(params),
    });
    return response.data;
  },

  getPatentGrantById: async (grantId: string): Promise<PatentGrant> => {
    const response = await apiClient.get(`/patent_grants/${grantId}`);
    return response.data[0];
  },

  createPatentGrant: async (
    patentId: string,
    data: Omit<PatentGrant, 'id' | 'patent_id' | 'created_at' | 'updated_at'>,
  ): Promise<PatentGrant> => {
    const response = await apiClient.post('/patent_grants', {
      patent_id: patentId,
      ...data,
    });
    return response.data[0];
  },

  updatePatentGrant: async (grantId: string, data: Partial<PatentGrant>): Promise<PatentGrant> => {
    const response = await apiClient.put(`/patent_grants/${grantId}`, data);
    return response.data[0];
  },

  deletePatentGrant: async (grantId: string): Promise<void> => {
    const response = await apiClient.delete(`/patent_grants/${grantId}`);
    return response.data;
  },
};
