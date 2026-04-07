import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ContractType } from '../../types/contract';
import { contractTypeApi } from './contractTypeApi';
import { contractTypeQueryKeys, invalidateContractTypeQueries } from './contractTypeQueryKeys';

export const useContractTypes = (): UseQueryResult<ContractType[], Error> => {
  return useQuery<ContractType[], Error>({
    queryKey: contractTypeQueryKeys.all,
    queryFn: () => contractTypeApi.getContractTypes(),
  });
};

export const useContractTypeById = (typeId: string): UseQueryResult<ContractType, Error> => {
  return useQuery<ContractType, Error>({
    queryKey: contractTypeQueryKeys.detail(typeId),
    queryFn: () => contractTypeApi.getContractTypeById(typeId),
    enabled: !!typeId,
  });
};

export const useCreateContractType = (): UseMutationResult<ContractType, Error, ContractType> => {
  const queryClient = useQueryClient();

  return useMutation<ContractType, Error, ContractType>({
    mutationFn: (data: ContractType) => contractTypeApi.createContractType(data),
    onSuccess: () => {
      void invalidateContractTypeQueries(queryClient);
    },
  });
};

export const useUpdateContractType = (): UseMutationResult<
  ContractType,
  Error,
  { id: string; data: Partial<ContractType> }
> => {
  const queryClient = useQueryClient();

  return useMutation<ContractType, Error, { id: string; data: Partial<ContractType> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractType> }) =>
      contractTypeApi.updateContractType(id, data),
    onSuccess: () => {
      void invalidateContractTypeQueries(queryClient);
    },
  });
};

export const useDeleteContractType = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (typeId: string) => contractTypeApi.deleteContractType(typeId),
    onSuccess: () => {
      void invalidateContractTypeQueries(queryClient);
    },
  });
};
