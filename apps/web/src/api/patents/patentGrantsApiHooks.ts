import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PatentGrant } from '../../types/patent';
import {
  patentGrantsApi,
  type PatentGrantsRegistryListQuery,
  type PatentGrantsRegistryResponse,
} from './patentGrantsApi';
import { invalidatePatentGrantQueries, patentGrantQueryKeys } from './patentGrantQueryKeys';
import { invalidatePatentQueries } from './patentQueryKeys';

export const usePatentGrants = (patentId?: string): UseQueryResult<PatentGrant[], Error> => {
  return useQuery<PatentGrant[], Error>({
    queryKey: patentGrantQueryKeys.listByPatentId(patentId),
    queryFn: () => patentGrantsApi.getPatentGrants(patentId!),
    enabled: !!patentId,
  });
};

export function usePatentGrantsRegistry(
  listQuery: PatentGrantsRegistryListQuery,
): UseQueryResult<PatentGrantsRegistryResponse, Error> {
  return useQuery<PatentGrantsRegistryResponse, Error>({
    queryKey: patentGrantQueryKeys.registryList(listQuery),
    queryFn: () => patentGrantsApi.getPatentGrantsRegistry(listQuery),
    placeholderData: previousData => previousData,
  });
}

export const usePatentGrantById = (grantId: string): UseQueryResult<PatentGrant, Error> => {
  return useQuery<PatentGrant, Error>({
    queryKey: patentGrantQueryKeys.detail(grantId),
    queryFn: () => patentGrantsApi.getPatentGrantById(grantId),
    enabled: !!grantId,
  });
};

type CreatePatentGrantInput = {
  patentId: string;
  data: Omit<PatentGrant, 'id' | 'patent_id' | 'created_at' | 'updated_at'>;
};
export const useCreatePatentGrant = (): UseMutationResult<PatentGrant, Error, CreatePatentGrantInput> => {
  const queryClient = useQueryClient();

  return useMutation<PatentGrant, Error, CreatePatentGrantInput>({
    mutationFn: ({ patentId, data }) => patentGrantsApi.createPatentGrant(patentId, data),
    onSuccess: () => {
      void invalidatePatentGrantQueries(queryClient);
      void invalidatePatentQueries(queryClient);
    },
  });
};

export const useUpdatePatentGrant = (): UseMutationResult<
  PatentGrant,
  Error,
  { id: string; data: Partial<PatentGrant> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PatentGrant, Error, { id: string; data: Partial<PatentGrant> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatentGrant> }) =>
      patentGrantsApi.updatePatentGrant(id, data),
    onSuccess: () => {
      void invalidatePatentGrantQueries(queryClient);
      void invalidatePatentQueries(queryClient);
    },
  });
};

export const useDeletePatentGrant = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (grantId: string) => patentGrantsApi.deletePatentGrant(grantId),
    onSuccess: (_, grantId) => {
  
      void queryClient.invalidateQueries({
        predicate: query =>
          query.queryKey[0] === 'patentGrants' &&
          !(query.queryKey[1] === 'detail' && query.queryKey[2] === grantId),
      });
      void invalidatePatentQueries(queryClient);
    },
  });
};
