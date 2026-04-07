import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ContractRevision } from '../../types/contract';
import { contractRevisionApi } from './contractRevisionsApi';
import { contractRevisionQueryKeys } from './contractRevisionQueryKeys';

export const useContractRevisions = (contractId: string): UseQueryResult<ContractRevision[], Error> => {
  return useQuery<ContractRevision[], Error>({
    queryKey: contractRevisionQueryKeys.byContract(contractId),
    queryFn: () => contractRevisionApi.getContractRevisions(contractId),
    enabled: !!contractId,
  });
};

export const useContractRevisionById = (
  contractId: string,
  revisionNumber: number,
): UseQueryResult<ContractRevision, Error> => {
  return useQuery<ContractRevision, Error>({
    queryKey: contractRevisionQueryKeys.byContractAndNumber(contractId, revisionNumber),
    queryFn: () => contractRevisionApi.getContractRevisionById(contractId, revisionNumber),
    enabled: !!contractId && revisionNumber !== undefined,
  });
};

export const useCreateContractRevision = (): UseMutationResult<
  ContractRevision,
  Error,
  { contractId: string; data: Omit<ContractRevision, 'contract_id' | 'revision_number'> }
> => {
  const queryClient = useQueryClient();

  return useMutation<
    ContractRevision,
    Error,
    { contractId: string; data: Omit<ContractRevision, 'contract_id' | 'revision_number'> }
  >({
    mutationFn: ({ contractId, data }) => contractRevisionApi.createContractRevision(contractId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: contractRevisionQueryKeys.byContract(variables.contractId),
      });
    },
  });
};

export const useDeleteContractRevision = (): UseMutationResult<
  void,
  Error,
  { contractId: string; revisionNumber: number }
> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { contractId: string; revisionNumber: number }>({
    mutationFn: ({ contractId, revisionNumber }) =>
      contractRevisionApi.deleteContractRevision(contractId, revisionNumber),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: contractRevisionQueryKeys.byContract(variables.contractId),
      });
      void queryClient.invalidateQueries({
        predicate: query => {
          return (
            query.queryKey.includes(variables.contractId) &&
            query.queryKey.includes(variables.revisionNumber.toString())
          );
        },
      });
    },
  });
};
