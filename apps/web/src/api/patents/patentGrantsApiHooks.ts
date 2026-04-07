import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PatentGrant } from '../../types/patent';
import { patentGrantsApi } from './patentGrantsApi';
import { invalidatePatentGrantQueries, patentGrantQueryKeys } from './patentGrantQueryKeys';

export const usePatentGrants = (patentId?: string): UseQueryResult<PatentGrant[], Error> => {
  return useQuery<PatentGrant[], Error>({
    queryKey: patentGrantQueryKeys.entry(patentId),
    queryFn: () => patentGrantsApi.getPatentGrants(patentId),
    enabled: !!patentId,
  });
};

export const usePatentGrantById = (grantId: string): UseQueryResult<PatentGrant, Error> => {
  return useQuery<PatentGrant, Error>({
    queryKey: patentGrantQueryKeys.entry(grantId),
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
    },
  });
};

export const useDeletePatentGrant = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (grantId: string) => patentGrantsApi.deletePatentGrant(grantId),
    onSuccess: (_, grantId) => {
      void queryClient.removeQueries({ queryKey: patentGrantQueryKeys.entry(grantId) });
      void queryClient.invalidateQueries({
        predicate: query => query.queryKey[0] === 'patentGrants' && query.queryKey[1] !== grantId,
      });
    },
  });
};
