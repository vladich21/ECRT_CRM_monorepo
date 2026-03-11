import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { contractApi } from './contractApi';
import { Contract, ContractStage } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';
import { PartnerContact } from '../../types/partner';

export interface ContractParams extends Partial<PartnerContact> {
  preview?: boolean;
}

export interface ContractsListResult {
  data: Contract[];
  total: number;
}

export function useContracts(
  params?: ContractParams,
  page?: number,
  pageSize?: number,
): UseQueryResult<ContractsListResult, Error> {
  const limit = pageSize ?? 50;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<ContractsListResult, Error>({
    queryKey: ['contracts', params ?? undefined, page, pageSize],
    queryFn: () => contractApi.getContracts(params, limit, offset),
  });
}

export const useContractsStates = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: ['contractsStates'],
    queryFn: () => contractApi.getContractsStates(),
  });
};

export const useContractsCategories = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: ['contractsCategories'],
    queryFn: () => contractApi.getContractsCategories(),
  });
};

export const useContractById = (contractId: string): UseQueryResult<Contract, Error> => {
  return useQuery<Contract, Error>({
    queryKey: ['contracts', contractId],
    queryFn: () => contractApi.getContractById(contractId),
    enabled: !!contractId,
  });
};

export const useCreateContract = (): UseMutationResult<Contract, Error, Omit<Contract, 'id' | 'created_at' | 'updated_at'>> => {
  const queryClient = useQueryClient();

  return useMutation<Contract, Error, Omit<Contract, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: (data: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => contractApi.addContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'], exact: false });
    },
  });
};

export const useUpdateContract = (): UseMutationResult<Contract, Error, { id: string; data: Partial<Contract> }> => {
  const queryClient = useQueryClient();

  return useMutation<Contract, Error, { id: string; data: Partial<Contract> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) => contractApi.editContract(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'], exact: false });
      queryClient.setQueryData(['contracts', variables.id], data);
    },
  });
};

export const useDeleteContract = (): UseMutationResult<Contract, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<Contract, Error, string>({
    mutationFn: (contractId: string) => contractApi.deleteContract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'], exact: false });
    },
  });
};

// Публичный доступ к договору (без авторизации)
export const useContractByPublicToken = (
  token: string,
  options?: { enabled?: boolean }
): UseQueryResult<Contract, Error> => {
  return useQuery<Contract, Error>({
    queryKey: ['contracts', 'public', token],
    queryFn: () => contractApi.getContractByPublicToken(token),
    enabled: options?.enabled !== false && !!token,
  });
};

export const useContractStagesByPublicToken = (
  token: string,
  options?: { enabled?: boolean }
): UseQueryResult<ContractStage[], Error> => {
  return useQuery<ContractStage[], Error>({
    queryKey: ['contracts', 'public', token, 'stages'],
    queryFn: () => contractApi.getContractStagesByPublicToken(token),
    enabled: options?.enabled !== false && !!token,
  });
};
