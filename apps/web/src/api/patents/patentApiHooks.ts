import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { patentApi, PatentsListResponse } from './patentApi';
import { Patent } from '../../types/patent';

export const useActivePatents = (
  page?: number,
  pageSize?: number,
): UseQueryResult<PatentsListResponse, Error> => {
  const limit = pageSize ?? 50;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<PatentsListResponse, Error>({
    queryKey: ['patents', page, pageSize],
    queryFn: () => patentApi.getPatents(false, false, limit, offset) as Promise<PatentsListResponse>,
  });
};

export const useDeletedPatents = (
  page?: number,
  pageSize?: number,
): UseQueryResult<PatentsListResponse, Error> => {
  const limit = pageSize ?? 50;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<PatentsListResponse, Error>({
    queryKey: ['patents', 'deleted', page, pageSize],
    queryFn: () => patentApi.getPatents(true, false, limit, offset) as Promise<PatentsListResponse>,
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
