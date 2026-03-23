import { Contract } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export type ContractListTabParam = 'all' | 'active' | 'draft' | 'inactive';

export interface ContractsListParams {
  partner_id?: string;
  preview?: boolean;
  search?: string;
  list_tab?: ContractListTabParam;
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
}

function compactParams(
  obj: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string | number | boolean>;
}

export const contractApi = {
  getContracts: async (
    params?: ContractsListParams,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ContractsListResponse> => {
    const response = await apiClient.get('/contracts', {
      params: compactParams({ ...(params ?? {}), limit, offset }),
    });
    return response.data;
  },

  /** Все договоры для справочника (выпадающие списки). Без лимита, ответ кэшируется на бэкенде. */
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
    return response.data;
  },
};
