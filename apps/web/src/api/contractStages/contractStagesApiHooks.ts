import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ContractStage } from '../../types/contract';
import { contractStageApi } from './contractStagesApi';
import { contractStageQueryKeys, invalidateContractStageQueries } from './contractStageQueryKeys';

export const useContractStages = (contractId: string): UseQueryResult<ContractStage[], Error> => {
  return useQuery<ContractStage[], Error>({
    queryKey: contractStageQueryKeys.byContract(contractId),
    queryFn: () => contractStageApi.getContractStages(contractId),
    enabled: !!contractId,
  });
};

export const useAllContractStages = (): UseQueryResult<ContractStage[], Error> => {
  return useQuery<ContractStage[], Error>({
    queryKey: contractStageQueryKeys.all,
    queryFn: () => contractStageApi.getContractStages(),
  });
};

export const useContractStageById = (contractId: string, stageId: string): UseQueryResult<ContractStage, Error> => {
  return useQuery<ContractStage, Error>({
    queryKey: contractStageQueryKeys.byStageId(stageId),
    queryFn: () => contractStageApi.getContractStageById(contractId, stageId),
    enabled: !!stageId,
  });
};

export const useCreateContractStage = (): UseMutationResult<
  ContractStage,
  Error,
  {
    contractId: string;
    data: ContractStage;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    ContractStage,
    Error,
    {
      contractId: string;
      data: ContractStage;
    }
  >({
    mutationFn: ({ contractId, data }) => contractStageApi.addContractStage(contractId, data),
    onSuccess: () => {
      void invalidateContractStageQueries(queryClient);
    },
  });
};

export const useUpdateContractStage = (): UseMutationResult<
  ContractStage,
  Error,
  {
    contractId: string;
    stageId: string;
    data: Partial<ContractStage>;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    ContractStage,
    Error,
    {
      contractId: string;
      stageId: string;
      data: Partial<ContractStage>;
    }
  >({
    mutationFn: ({ contractId, stageId, data }) => contractStageApi.editContractStage(contractId, stageId, data),
    onSuccess: () => {
      void invalidateContractStageQueries(queryClient);
    },
  });
};

export const useDeleteContractStage = (): UseMutationResult<
  void,
  Error,
  {
    contractId: string;
    stageId: string;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      contractId: string;
      stageId: string;
    }
  >({
    mutationFn: ({ contractId, stageId }) => contractStageApi.deleteContractStage(contractId, stageId),
    onSuccess: () => {
      void invalidateContractStageQueries(queryClient);
    },
  });
};
