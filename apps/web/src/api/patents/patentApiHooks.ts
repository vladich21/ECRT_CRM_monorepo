import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Patent } from '../../types/patent';
import { patentApi, PatentsListResponse, type PatentListQuery } from './patentApi';
import type { PatentsListServerFilters } from './patentListFilters.types';

/** Пустые фильтры для загрузки кандидатов в целевой РИД (преобразование). */
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
};
import { invalidatePatentQueries, patentQueryKeys } from './patentQueryKeys';

export type PatentsDeletedScope = 'active' | 'deleted' | 'all';

export type { PatentsListServerFilters } from './patentListFilters.types';

function buildListQuery(
  deletedScope: PatentsDeletedScope,
  page: number,
  pageSize: number,
  filters: PatentsListServerFilters,
): PatentListQuery {
  const authorIds = filters.authorIds ?? [];
  const areaIds = filters.areaIds ?? [];
  const registrationYears = filters.registrationYears ?? [];
  const registrationCirYears = filters.registrationCirYears ?? [];
  const grantRegionKeys = filters.grantRegionKeys ?? [];
  return {
    preview: false,
    deletedScope,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: filters.search.trim() || undefined,
    department_id: filters.departmentId ?? undefined,
    status_id: filters.statusId ?? undefined,
    author_ids: authorIds.length > 0 ? authorIds : undefined,
    area_ids: areaIds.length > 0 ? areaIds : undefined,
    responsible_for_patenting_id: filters.responsibleId ?? undefined,
    registration_years: registrationYears.length > 0 ? registrationYears.join(',') : undefined,
    registration_cir_years: registrationCirYears.length > 0 ? registrationCirYears.join(',') : undefined,
    project_id: filters.projectId ?? undefined,
    contract_id: filters.contractId ?? undefined,
    grant_regions: grantRegionKeys.length > 0 ? grantRegionKeys.join(',') : undefined,
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
        throw new Error('Ожидался полный список патентов, пришёл preview');
      }
      return res;
    },
    placeholderData: previousData => previousData,
  });
}

export const usePatentById = (patentId: string): UseQueryResult<Patent, Error> => {
  return useQuery<Patent, Error>({
    queryKey: patentQueryKeys.detail(patentId),
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
