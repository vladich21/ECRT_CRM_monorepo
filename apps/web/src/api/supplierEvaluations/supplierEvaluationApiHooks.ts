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
import { fetchPartnerSupplierEvalKpi } from './supplierEvaluationApi';
import {
  supplierEvaluationApi,
  type SupplierEvaluationsStatusFilter,
} from './supplierEvaluationApi';

const supplierEvaluationQueryKey = {
  criteria: ['supplier-evaluations', 'criteria'] as const,
  partnerContractProjects: (partnerId: string) =>
    ['supplier-evaluations', 'partner-contract-projects', partnerId] as const,
  tabCounts: (p: {
    partner_id?: string;
    project_id?: string;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: number;
    evaluated_at_from?: string;
    evaluated_at_to?: string;
  }) => ['supplier-evaluations', 'tab-counts', p] as const,
  list: (p: {
    partner_id?: string;
    project_id?: string;
    status?: SupplierEvaluationsStatusFilter;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: number;
    evaluated_at_from?: string;
    evaluated_at_to?: string;
    ui_status?: SupplierEvaluationUiStatusParam;
    sort_field?: SupplierEvaluationSortField;
    sort_dir?: SupplierEvaluationSortDir;
    limit: number;
    offset: number;
  }) => ['supplier-evaluations', 'list', p] as const,
  one: (id: string) => ['supplier-evaluations', id] as const,
  block: (partnerId: string, projectId: string) =>
    ['supplier-evaluations', 'block', partnerId, projectId] as const,
  partnerKpi: (partnerId: string) => ['supplier-evaluations', 'partner-kpi', partnerId] as const,
  partnerInitial: (partnerId: string) => ['supplier-evaluations', 'partner-initial', partnerId] as const,
};

export function useSupplierEvaluationCriteria() {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.criteria,
    queryFn: () => supplierEvaluationApi.getCriteria(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartnerContractProjectsForEvaluation(partnerId: string, enabled: boolean) {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.partnerContractProjects(partnerId),
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
    evaluated_year?: number;
    evaluated_at_from?: string;
    evaluated_at_to?: string;
  },
  enabled = true,
) {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.tabCounts(params),
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
    evaluated_year?: number;
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
    queryKey: supplierEvaluationQueryKey.list({
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
    queryKey: supplierEvaluationQueryKey.one(id ?? ''),
    queryFn: () => supplierEvaluationApi.getById(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useSupplierEvaluationBlock(partnerId: string, projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.block(partnerId, projectId),
    queryFn: () => supplierEvaluationApi.getActiveBlock(partnerId, projectId),
    enabled: enabled && Boolean(partnerId) && Boolean(projectId),
  });
}

export function getPartnerSupplierEvalKpiQueryKey(partnerId: string) {
  return supplierEvaluationQueryKey.partnerKpi(partnerId);
}

export function usePartnerSupplierEvalKpi(partnerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.partnerKpi(partnerId ?? ''),
    queryFn: () => fetchPartnerSupplierEvalKpi(partnerId!),
    enabled: Boolean(partnerId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function getPartnerInitialEvalQueryKey(partnerId: string) {
  return supplierEvaluationQueryKey.partnerInitial(partnerId);
}

export function usePartnerInitialSupplierEval(partnerId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.partnerInitial(partnerId ?? ''),
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
      queryClient.invalidateQueries({ queryKey: ['supplier-evaluations'] });
    },
  });
}

export function useCreateInitialSupplierEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInitialSupplierEvaluationPayload) => supplierEvaluationApi.createInitial(payload),
    onSuccess: (data: InitialSupplierEvaluation | null) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-evaluations'] });
      if (data?.partner_id) {
        queryClient.invalidateQueries({ queryKey: supplierEvaluationQueryKey.partnerInitial(data.partner_id) });
      }
    },
  });
}

export function useDeactivateSupplierEvaluationBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) => supplierEvaluationApi.deactivateBlock(blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-evaluations'] });
    },
  });
}

export function useDeleteSupplierEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supplierEvaluationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-evaluations'] });
    },
  });
}
