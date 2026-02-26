import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { patentApi } from './patentApi';
import { Patent } from '../../types/patent';

export const useActivePatents = (): UseQueryResult<Patent[], Error> => {
  return useQuery<Patent[], Error>({
    queryKey: ['patents'],
    queryFn: () => patentApi.getPatents(false),
  });
};

export const useDeletedPatents = (): UseQueryResult<Patent[], Error> => {
  return useQuery<Patent[], Error>({
    queryKey: ['patents', 'is_deleted'],
    queryFn: () => patentApi.getPatents(true),
  });
};

export const usePatentById = (patentId: string): UseQueryResult<Patent, Error> => {
  return useQuery<Patent, Error>({
    queryKey: ['patents', patentId],
    queryFn: () => patentApi.getPatentById(patentId),
    enabled: !!patentId,
  });
};

export const useCreatePatent = (): UseMutationResult<
  Patent,
  Error,
  Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>
> => {
  const queryClient = useQueryClient();

  return useMutation<Patent, Error, Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>>({
    mutationFn: (data: Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at'>) =>
      patentApi.createPatent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patents'] });
    },
  });
};

export const useUpdatePatent = (): UseMutationResult<Patent, Error, { id: string; data: Partial<Patent> }> => {
  const queryClient = useQueryClient();

  return useMutation<Patent, Error, { id: string; data: Partial<Patent> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patent> }) => patentApi.updatePatent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patents'] });
      queryClient.invalidateQueries({ queryKey: ['patents', variables.id] });
    },
  });
};

export const useRestorePatent = (): UseMutationResult<Patent, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<Patent, Error, string>({
    mutationFn: (patentId: string) => patentApi.restorePatent(patentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patents'] });
    },
  });
};

export const useDeletePatent = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (patentId: string) => patentApi.deletePatent(patentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patents'] });
    },
  });
};
