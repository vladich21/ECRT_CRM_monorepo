import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Patent } from '../../types/patent';
import { patentApi, PatentsListResponse, type PatentListQuery } from './patentApi';

export type PatentsDeletedScope = 'active' | 'deleted' | 'all';

export type PatentsListServerFilters = {
  search: string;
  departmentId?: string | null;
  statusId?: string | null;
  authorIds: string[];
  responsibleId?: string | null;
};

function buildListQuery(
  deletedScope: PatentsDeletedScope,
  page: number,
  pageSize: number,
  filters: PatentsListServerFilters,
): PatentListQuery {
  return {
    preview: false,
    deletedScope,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: filters.search.trim() || undefined,
    department_id: filters.departmentId ?? undefined,
    status_id: filters.statusId ?? undefined,
    author_ids: filters.authorIds.length > 0 ? filters.authorIds : undefined,
    created_by: filters.responsibleId ?? undefined,
  };
}

export function usePatentsList(
  deletedScope: PatentsDeletedScope,
  page: number,
  pageSize: number,
  filters: PatentsListServerFilters,
): UseQueryResult<PatentsListResponse, Error> {
  const listQuery = buildListQuery(deletedScope, page, pageSize, filters);
  return useQuery<PatentsListResponse, Error>({
    queryKey: ['patents', 'list', listQuery],
    queryFn: async () => {
      const res = await patentApi.getPatents(listQuery);
      if (Array.isArray(res)) {
        throw new Error('Ожидался полный список патентов, пришёл preview');
      }
      return res;
    },
    placeholderData: previousData => previousData,
  });
}

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
  Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>
> => {
  const queryClient = useQueryClient();
  return useMutation<Patent, Error, Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>>({
    mutationFn: (data: Omit<Patent, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>) => patentApi.createPatent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patents'] });
    },
  });
};

export const useUpdatePatent = (): UseMutationResult<
  Patent,
  Error,
  {
    id: string;
    data: Partial<Patent>;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    Patent,
    Error,
    {
      id: string;
      data: Partial<Patent>;
    }
  >({
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
