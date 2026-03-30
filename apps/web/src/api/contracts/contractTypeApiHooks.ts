import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ContractType } from '../../types/contract';
import { contractTypeApi } from './contractTypeApi';

export const useContractTypes = (): UseQueryResult<ContractType[], Error> => {
  return useQuery<ContractType[], Error>({
    queryKey: ['contractTypes'],
    queryFn: () => contractTypeApi.getContractTypes(),
  });
};

export const useContractTypeById = (typeId: string): UseQueryResult<ContractType, Error> => {
  return useQuery<ContractType, Error>({
    queryKey: ['contractTypes', typeId],
    queryFn: () => contractTypeApi.getContractTypeById(typeId),
    enabled: !!typeId,
  });
};

export const useCreateContractType = (): UseMutationResult<ContractType, Error, ContractType> => {
  const queryClient = useQueryClient();

  return useMutation<ContractType, Error, ContractType>({
    mutationFn: (data: ContractType) => contractTypeApi.createContractType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'contractTypes');
        },
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'contractTypes');
        },
      });
    },
  });
};

export const useDeleteContractType = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (typeId: string) => contractTypeApi.deleteContractType(typeId),
    onSuccess: (_, typeId) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'contractTypes');
        },
      });
    },
  });
};
