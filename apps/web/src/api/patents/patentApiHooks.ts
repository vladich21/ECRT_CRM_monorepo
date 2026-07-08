import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Patent } from '../../types/patent';
import { patentApi, PatentsListResponse, buildPatentsExportQuery, type PatentListQuery, type PatentsDeletedScope } from './patentApi';
import type { PatentsListServerFilters } from './patentListFilters.types';
import { invalidatePatentQueries, patentQueryKeys } from './patentQueryKeys';

export const patentsListServerFiltersEmpty: PatentsListServerFilters = {
  search: '',
  departmentId: null,
  statusId: null,
  authorIds: [],
  areaIds: [],
  responsibleId: null,
  registrationYears: [],
  registrationCirYears: [],
  projectId: null,
  contractId: null,
  grantRegionKeys: [],
  sortBy: 'registration_number',
  sortOrder: 'asc',
};

export type { PatentsDeletedScope } from './patentApi';

export type { PatentsListServerFilters } from './patentListFilters.types';

function buildListQuery(
  deletedScope: PatentsDeletedScope,
  page: number,
  pageSize: number,
  filters: PatentsListServerFilters,
): PatentListQuery {
  return {
    ...buildPatentsExportQuery(deletedScope, filters),
    preview: false,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function usePatentsLinkedContractIds(
  deletedScope: PatentsDeletedScope,
): UseQueryResult<string[], Error> {
  return useQuery<string[], Error>({
    queryKey: patentQueryKeys.linkedContractIds(deletedScope),
    queryFn: () => patentApi.getLinkedContractIds(deletedScope),
  });
}

export function usePatentsList(
  deletedScope: PatentsDeletedScope,
  page: number,
  pageSize: number,
  filters: PatentsListServerFilters,
): UseQueryResult<PatentsListResponse, Error> {
  const listQuery = buildListQuery(deletedScope, page, pageSize, filters);
  return useQuery<PatentsListResponse, Error>({
    queryKey: patentQueryKeys.list(listQuery),
    queryFn: async () => {
      const res = await patentApi.getPatents(listQuery);
      if (Array.isArray(res)) {
        throw new Error('Ожидался полный список патентов, пришел preview');
      }
      return res;
    },
    placeholderData: previousData => previousData,
  });
}

export const usePatentById = (
  patentId: string,
  initialData?: Patent,
): UseQueryResult<Patent, Error> => {
  return useQuery<Patent, Error>({
    queryKey: patentQueryKeys.detail(patentId),
    queryFn: () => patentApi.getPatentById(patentId),
    enabled: !!patentId,
    initialData: initialData?.id === patentId ? initialData : undefined,
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
      void invalidatePatentQueries(queryClient);
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
      void invalidatePatentQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: patentQueryKeys.detail(variables.id) });
    },
  });
};

export const useRestorePatent = (): UseMutationResult<Patent, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<Patent, Error, string>({
    mutationFn: (patentId: string) => patentApi.restorePatent(patentId),
    onSuccess: () => {
      void invalidatePatentQueries(queryClient);
    },
  });
};

export const useDeletePatent = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (patentId: string) => patentApi.deletePatent(patentId),
    onSuccess: () => {
      void invalidatePatentQueries(queryClient);
    },
  });
};
