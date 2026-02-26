import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { ContractStage } from '../../types/contract';
import { contractStageApi } from './contractStagesApi';

export const useContractStages = (contractId: string): UseQueryResult<ContractStage[], Error> => {
  return useQuery<ContractStage[], Error>({
    queryKey: ['contract-stages', contractId],
    queryFn: () => contractStageApi.getContractStages(contractId),
    enabled: false, // Эндпоинт не готов, отключаем запрос
    retry: false,
  });
};

export const useAllContractStages = (): UseQueryResult<ContractStage[], Error> => {
  return useQuery<ContractStage[], Error>({
    queryKey: ['contract-stages'],
    queryFn: () => contractStageApi.getContractStages(),
  });
};

export const useContractStageById = (contractId: string, stageId: string): UseQueryResult<ContractStage, Error> => {
  return useQuery<ContractStage, Error>({
    queryKey: ['contract-stages', stageId],
    queryFn: () => contractStageApi.getContractStageById(contractId, stageId),
    enabled: !!stageId,
  });
};

export const useCreateContractStage = (): UseMutationResult<
  ContractStage,
  Error,
  { contractId: string; data: ContractStage }
> => {
  const queryClient = useQueryClient();

  return useMutation<ContractStage, Error, { contractId: string; data: ContractStage }>({
    mutationFn: ({ contractId, data }) => contractStageApi.addContractStage(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key.includes('contract-stages'));
        },
      });
    },
  });
};

export const useUpdateContractStage = (): UseMutationResult<
  ContractStage,
  Error,
  { contractId: string; stageId: string; data: Partial<ContractStage> }
> => {
  const queryClient = useQueryClient();

  return useMutation<ContractStage, Error, { contractId: string; stageId: string; data: Partial<ContractStage> }>({
    mutationFn: ({ contractId, stageId, data }) => contractStageApi.editContractStage(contractId, stageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key.includes('contract-stages'));
        },
      });
    },
  });
};

export const useDeleteContractStage = (): UseMutationResult<void, Error, { contractId: string; stageId: string }> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { contractId: string; stageId: string }>({
    mutationFn: ({ contractId, stageId }) => contractStageApi.deleteContractStage(contractId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key.includes('contract-stages'));
        },
      });
    },
  });
};
