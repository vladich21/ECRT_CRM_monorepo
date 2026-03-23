import { Contract } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';
import { apiClient } from '../clients';
import type { DeletionScope, DeletionTabCounts } from '../../constants/deletionScope';

export type ContractListTabParam = 'all' | 'active' | 'draft' | 'inactive';

export interface ContractsListParams {
  partner_id?: string;
  preview?: boolean;
  search?: string;
  list_tab?: ContractListTabParam;
  deleted_scope?: DeletionScope;
  category_id?: string;
  state_id?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface ContractsListResponse {
  data: Contract[];
  total: number;
  tab_counts?: {
    all: number;
    active: number;
    draft: number;
    inactive: number;
  };
  deletion_tab_counts?: DeletionTabCounts;
}

function compactParams(
  obj: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Record<
    string,
    string | number | boolean
  >;
}
function listParamsToQuery(
  params: ContractsListParams | undefined,
  limit: number,
  offset: number,
): Record<string, string | number | boolean | undefined> {
  const p = params ?? {};
  return {
    ...p,
    deleted_scope: p.deleted_scope ?? 'active',
    limit,
    offset,
  };
}
export const contractApi = {
  getContracts: async (
    params?: ContractsListParams,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ContractsListResponse> => {
    const response = await apiClient.get('/contracts', {
      params: compactParams(listParamsToQuery(params, limit, offset)),
    });
    return response.data;
  },
  getContractsForReference: async (): Promise<ContractsListResponse> => {
    const response = await apiClient.get('/contracts', {
      params: { for_reference: 1 },
    });
    return response.data;
  },
  getContractsStates: async (): Promise<Reference[]> => {
    const response = await apiClient.get('/contract_states');
    return response.data;
  },
  getContractsCategories: async (): Promise<Reference[]> => {
    const response = await apiClient.get('/contract_categories');
    return response.data;
  },
  getContractById: async (contractId: string): Promise<Contract> => {
    const response = await apiClient.get(`/contracts/${contractId}`);
    return response.data[0];
  },
  addContract: async (data: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> => {
    const response = await apiClient.post(`/contracts`, data);
    return response.data[0];
  },
  editContract: async (contractId: string, data: Partial<Contract>): Promise<Contract> => {
    const response = await apiClient.put(`/contracts/${contractId}`, data);
    return response.data[0];
  },
  deleteContract: async (contractId: string): Promise<Contract> => {
    const response = await apiClient.delete(`/contracts/${contractId}`);
    const body = response.data;
    return Array.isArray(body) ? body[0] : body;
  },
  restoreContract: async (contractId: string): Promise<Contract> => {
    const response = await apiClient.put(`/contracts/${contractId}/restore`);
    return response.data[0];
  },
};
