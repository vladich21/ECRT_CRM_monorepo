import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateSupplierEvaluationPayload,
  CreateInitialSupplierEvaluationPayload,
  InitialSupplierEvaluation,
  SupplierEvaluationCategory,
  SupplierEvaluationSortDir,
  SupplierEvaluationSortField,
  SupplierEvaluationUiStatusParam,
} from '../../types/supplierEvaluation';
import {
  fetchPartnerSupplierEvalKpi,
  supplierEvaluationApi,
  type SupplierEvaluationsStatusFilter,
} from './supplierEvaluationApi';
import { invalidateSupplierEvaluationQueries, supplierEvaluationQueryKeys } from './supplierEvaluationQueryKeys';

export {
  getPartnerInitialEvalQueryKey,
  getPartnerSupplierEvalKpiQueryKey,
  supplierEvaluationQueryKeys,
} from './supplierEvaluationQueryKeys';

export function useSupplierEvaluationCriteria() {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.criteria,
    queryFn: () => supplierEvaluationApi.getCriteria(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSupplierEvaluationRegistryCreators(partnerId?: string) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.registryCreators(partnerId),
    queryFn: () => supplierEvaluationApi.getRegistryCreators(partnerId),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartnerContractProjectsForEvaluation(partnerId: string, enabled: boolean) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.partnerContractProjects(partnerId),
    queryFn: () => supplierEvaluationApi.getPartnerContractProjects(partnerId),
    enabled: Boolean(partnerId) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useSupplierEvaluationTabCounts(
  params: {
    partner_id?: string;
    project_id?: string;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: string | number;
    evaluated_at_from?: string;
    evaluated_at_to?: string;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.tabCounts(params),
    queryFn: () => supplierEvaluationApi.getTabCounts(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSupplierEvaluationsList(
  params: {
    partner_id?: string;
    project_id?: string;
    status?: SupplierEvaluationsStatusFilter;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: string | number;
    evaluated_at_from?: string;
    evaluated_at_to?: string;
    ui_status?: SupplierEvaluationUiStatusParam;
    sort_field?: SupplierEvaluationSortField;
    sort_dir?: SupplierEvaluationSortDir;
    limit?: number;
    offset?: number;
  },
  enabled = true,
) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.list({
      ...params,
      limit,
      offset,
      sort_field: params.sort_field,
      sort_dir: params.sort_dir,
    }),
    queryFn: () =>
      supplierEvaluationApi.getList({
        ...params,
        limit,
        offset,
      }),
    enabled,
  });
}

export function useSupplierEvaluationDetail(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.one(id ?? ''),
    queryFn: () => supplierEvaluationApi.getById(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useSupplierEvaluationBlock(partnerId: string, projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.block(partnerId, projectId),
    queryFn: () => supplierEvaluationApi.getActiveBlock(partnerId, projectId),
    enabled: enabled && Boolean(partnerId) && Boolean(projectId),
  });
}

export function usePartnerSupplierEvalKpi(partnerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.partnerKpi(partnerId ?? ''),
    queryFn: () => fetchPartnerSupplierEvalKpi(partnerId!),
    enabled: Boolean(partnerId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function usePartnerInitialSupplierEval(partnerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: supplierEvaluationQueryKeys.partnerInitial(partnerId ?? ''),
    queryFn: () => supplierEvaluationApi.getActiveInitial(partnerId!),
    enabled: Boolean(partnerId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateSupplierEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierEvaluationPayload) => supplierEvaluationApi.create(payload),
    onSuccess: () => {
      void invalidateSupplierEvaluationQueries(queryClient);
    },
  });
}

export function useCreateInitialSupplierEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInitialSupplierEvaluationPayload) => supplierEvaluationApi.createInitial(payload),
    onSuccess: (data: InitialSupplierEvaluation | null) => {
      void invalidateSupplierEvaluationQueries(queryClient);
      if (data?.partner_id) {
        void queryClient.invalidateQueries({
          queryKey: supplierEvaluationQueryKeys.partnerInitial(data.partner_id),
        });
      }
    },
  });
}

export function useDeactivateSupplierEvaluationBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) => supplierEvaluationApi.deactivateBlock(blockId),
    onSuccess: () => {
      void invalidateSupplierEvaluationQueries(queryClient);
    },
  });
}

export function useDeleteSupplierEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supplierEvaluationApi.delete(id),
    onSuccess: () => {
      void invalidateSupplierEvaluationQueries(queryClient);
    },
  });
}
