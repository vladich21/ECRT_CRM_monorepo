import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ContractRevision } from '../../types/contract';
import { contractRevisionApi } from './contractRevisionsApi';

export const useContractRevisions = (contractId: string): UseQueryResult<ContractRevision[], Error> => {
  return useQuery<ContractRevision[], Error>({
    queryKey: ['contract-revisions', contractId],
    queryFn: () => contractRevisionApi.getContractRevisions(contractId),
    enabled: !!contractId,
  });
};

export const useContractRevisionById = (
  contractId: string,
  revisionNumber: number,
): UseQueryResult<ContractRevision, Error> => {
  return useQuery<ContractRevision, Error>({
    queryKey: ['contract-revisions', contractId, revisionNumber],
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
      queryClient.invalidateQueries({
        queryKey: ['contract-revisions', variables.contractId],
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
      queryClient.invalidateQueries({
        queryKey: ['contract-revisions', variables.contractId],
      });
      // Также инвалидируем все запросы сравнения, которые могли включать эту ревизию
      queryClient.invalidateQueries({
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
