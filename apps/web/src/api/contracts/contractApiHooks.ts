import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Contract } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';
import { invalidatePartnerQueries } from '../partners/partnerQueryKeys';
import {
  contractQueryKeys,
  invalidateContractListQueriesAfterDelete,
  invalidateContractQueries,
} from './contractQueryKeys';
import {
  contractApi,
  ContractDeleteResult,
  ContractsListParams,
  ContractsListResponse,
  CreateContractPayload,
} from './contractApi';

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
    queryKey: contractQueryKeys.list(params, page, pageSize),
    queryFn: () => contractApi.getContracts(params, limit, offset),
    placeholderData: prev => prev,
    enabled: queryOptions?.enabled !== false,
  });
}

export const useContractsStates = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: contractQueryKeys.states,
    queryFn: () => contractApi.getContractsStates(),
  });
};

export const useContractsCategories = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: contractQueryKeys.categories,
    queryFn: () => contractApi.getContractsCategories(),
  });
};

export const useContractById = (contractId: string): UseQueryResult<Contract, Error> => {
  return useQuery<Contract, Error>({
    queryKey: contractQueryKeys.detail(contractId),
    queryFn: () => contractApi.getContractById(contractId),
    enabled: !!contractId,
  });
};

export const useCreateContract = (): UseMutationResult<Contract, Error, CreateContractPayload> => {
  const queryClient = useQueryClient();
  return useMutation<Contract, Error, CreateContractPayload>({
    mutationFn: (data: CreateContractPayload) => contractApi.addContract(data),
    onSuccess: () => {
      void invalidateContractQueries(queryClient);
      void invalidatePartnerQueries(queryClient);
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
      void invalidateContractQueries(queryClient);
      queryClient.setQueryData(contractQueryKeys.detail(variables.id), data);
    },
  });
};

export const useDeleteContract = (): UseMutationResult<ContractDeleteResult, Error, string, unknown> => {
  const queryClient = useQueryClient();
  return useMutation<ContractDeleteResult, Error, string>({
    mutationFn: (contractId: string) => contractApi.deleteContract(contractId),
    onSuccess: () => {
      queueMicrotask(() => {
        void invalidateContractListQueriesAfterDelete(queryClient);
        void invalidatePartnerQueries(queryClient);
      });
    },
  });
};

export const useRestoreContract = (): UseMutationResult<Contract, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<Contract, Error, string>({
    mutationFn: (contractId: string) => contractApi.restoreContract(contractId),
    onSuccess: (_, id) => {
      void invalidateContractQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: contractQueryKeys.detail(id) });
      void invalidatePartnerQueries(queryClient);
    },
  });
};
