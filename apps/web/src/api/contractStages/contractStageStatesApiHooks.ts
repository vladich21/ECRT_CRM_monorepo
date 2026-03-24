import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ContractStageState } from '../../types/contract';
import { contractStageStateApi } from './contractStageStatesApi';

export const useContractStageStates = (): UseQueryResult<ContractStageState[], Error> => {
  return useQuery<ContractStageState[], Error>({
    queryKey: ['contract-stage-states'],
    queryFn: () => contractStageStateApi.getContractStageStates(),
  });
};

export const useContractStageStateById = (stateId: string): UseQueryResult<ContractStageState, Error> => {
  return useQuery<ContractStageState, Error>({
    queryKey: ['contract-stage-states', stateId],
    queryFn: () => contractStageStateApi.getContractStageStateById(stateId),
    enabled: !!stateId,
  });
};

export const useCreateContractStageState = (): UseMutationResult<
  ContractStageState,
  Error,
  Omit<ContractStageState, 'id'>
> => {
  const queryClient = useQueryClient();

  return useMutation<ContractStageState, Error, Omit<ContractStageState, 'id'>>({
    mutationFn: (data: Omit<ContractStageState, 'id'>) => contractStageStateApi.addContractStageState(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key.includes('contract-stage-states'));
        },
      });
    },
  });
};

export const useUpdateContractStageState = (): UseMutationResult<
  ContractStageState,
  Error,
  { id: string; data: Partial<ContractStageState> }
> => {
  const queryClient = useQueryClient();

  return useMutation<ContractStageState, Error, { id: string; data: Partial<ContractStageState> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContractStageState> }) =>
      contractStageStateApi.editContractStageState(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key.includes('contract-stage-states'));
        },
      });
    },
  });
};

export const useDeleteContractStageState = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (stateId: string) => contractStageStateApi.deleteContractStageState(stateId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key.includes('contract-stage-states'));
        },
      });
    },
  });
};
