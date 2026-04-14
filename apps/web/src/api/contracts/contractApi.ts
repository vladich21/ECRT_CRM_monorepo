import type { DeletionScope, DeletionTabCounts } from '../../constants/deletionScope';
import { Contract } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export type CreateContractPayload = Partial<{
  [K in keyof Omit<Contract, 'id' | 'created_at' | 'updated_at'>]:
    | Omit<Contract, 'id' | 'created_at' | 'updated_at'>[K]
    | null;
}>;

export type ContractDeleteResult =
  | { deletion_mode: 'soft'; contract: Contract }
  | { deletion_mode: 'hard'; id: string };

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

function normalizeContractFlags(contract: Contract): Contract {
  const contractRecord = contract as unknown as Record<string, unknown>;
  return {
    ...contract,
    is_deleted: Boolean(contractRecord.is_deleted ?? contractRecord.isDeleted),
  };
}

function compactParams(
  obj: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<
    string,
    string | number | boolean
  >;
}
function listParamsToQuery(
  params: ContractsListParams | undefined,
  limit: number,
  offset: number,
): Record<string, string | number | boolean | undefined> {
  const listParams = params ?? {};
  return {
    ...listParams,
    deleted_scope: listParams.deleted_scope ?? 'active',
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
    const body = response.data as ContractsListResponse;
    return {
      ...body,
      data: (body.data ?? []).map(normalizeContractFlags),
    };
  },
 
  getContractsForReference: async (opts?: { includeInactive?: boolean }): Promise<ContractsListResponse> => {
    const response = await apiClient.get('/contracts', {
      params: compactParams({
        for_reference: 1,
        ...(opts?.includeInactive ? { include_inactive: 1 } : {}),
      }),
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
    const contract = response.data?.[0] as Contract | undefined;
    if (!contract) {
      throw new Error('Contract not found');
    }
    return normalizeContractFlags(contract);
  },
  addContract: async (data: CreateContractPayload): Promise<Contract> => {
    const response = await apiClient.post(`/contracts`, data);
    return normalizeContractFlags(response.data[0] as Contract);
  },
  editContract: async (contractId: string, data: Partial<Contract>): Promise<Contract> => {
    const response = await apiClient.put(`/contracts/${contractId}`, data);
    return normalizeContractFlags(response.data[0] as Contract);
  },
  deleteContract: async (contractId: string): Promise<ContractDeleteResult> => {
    const response = await apiClient.delete(`/contracts/${contractId}`);
    const data = response.data as ContractDeleteResult;
    if (data && typeof data === 'object' && 'deletion_mode' in data && data.deletion_mode === 'soft' && data.contract) {
      return { ...data, contract: normalizeContractFlags(data.contract) };
    }
    return data;
  },
  restoreContract: async (contractId: string): Promise<Contract> => {
    const response = await apiClient.put(`/contracts/${contractId}/restore`);
    return normalizeContractFlags(response.data[0] as Contract);
  },
};
