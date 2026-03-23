import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { contractApi, ContractsListParams, ContractsListResponse } from './contractApi';
import { Contract } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';

export type { ContractsListParams };

export function useContracts(
  params?: ContractsListParams,
  page?: number,
  pageSize?: number,
  queryOptions?: {
    enabled?: boolean;
  },
): UseQueryResult<ContractsListResponse, Error> {
  const limit = pageSize ?? 50;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<ContractsListResponse, Error>({
    queryKey: ['contracts', params ?? {}, page, pageSize],
    queryFn: () => contractApi.getContracts(params, limit, offset),
    placeholderData: prev => prev,
    enabled: queryOptions?.enabled !== false,
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

export const useCreateContract = (): UseMutationResult<
  Contract,
  Error,
  Omit<Contract, 'id' | 'created_at' | 'updated_at'>
> => {
  const queryClient = useQueryClient();
  return useMutation<Contract, Error, Omit<Contract, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: (data: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => contractApi.addContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'], exact: false });
    },
  });
};

export const useUpdateContract = (): UseMutationResult<
  Contract,
  Error,
  {
    id: string;
    data: Partial<Contract>;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    Contract,
    Error,
    {
      id: string;
      data: Partial<Contract>;
    }
  >({
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
      queueMicrotask(() => {
        queryClient.invalidateQueries({ queryKey: ['contracts'], exact: false });
      });
    },
  });
};

export const useRestoreContract = (): UseMutationResult<Contract, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<Contract, Error, string>({
    mutationFn: (contractId: string) => contractApi.restoreContract(contractId),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['contracts', id] });
    },
  });
};
