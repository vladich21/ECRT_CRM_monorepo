import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateSupplierEvaluationPayload,
  SupplierEvaluationCategory,
  SupplierEvaluationSortDir,
  SupplierEvaluationSortField,
  SupplierEvaluationUiStatusParam,
} from '../../types/supplierEvaluation';
import {
  supplierEvaluationApi,
  type SupplierEvaluationsStatusFilter,
} from './supplierEvaluationApi';

const supplierEvaluationQueryKey = {
  criteria: ['supplier-evaluations', 'criteria'] as const,
  tabCounts: (p: {
    partner_id?: string;
    project_id?: string;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: number;
  }) => ['supplier-evaluations', 'tab-counts', p] as const,
  list: (p: {
    partner_id?: string;
    project_id?: string;
    status?: SupplierEvaluationsStatusFilter;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: number;
    ui_status?: SupplierEvaluationUiStatusParam;
    sort_field?: SupplierEvaluationSortField;
    sort_dir?: SupplierEvaluationSortDir;
    limit: number;
    offset: number;
  }) => ['supplier-evaluations', 'list', p] as const,
  one: (id: string) => ['supplier-evaluations', id] as const,
  block: (partnerId: string, projectId: string) =>
    ['supplier-evaluations', 'block', partnerId, projectId] as const,
};

export function useSupplierEvaluationCriteria() {
  return useQuery({
    queryKey: supplierEvaluationQueryKey.criteria,
    queryFn: () => supplierEvaluationApi.getCriteria(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSupplierEvaluationTabCounts(
  params: {
    partner_id?: string;
    project_id?: string;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: number;
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

export function useCreateSupplierEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierEvaluationPayload) => supplierEvaluationApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-evaluations'] });
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
