import type { QueryClient } from '@tanstack/react-query';

import type {
  SupplierEvaluationCategory,
  SupplierEvaluationSortDir,
  SupplierEvaluationSortField,
  SupplierEvaluationUiStatusParam,
} from '../../types/supplierEvaluation';
import type { SupplierEvaluationsStatusFilter } from './supplierEvaluationApi';

export const supplierEvaluationQueryKeys = {
  all: ['supplier-evaluations'] as const,
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
} as const;

export function invalidateSupplierEvaluationQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: supplierEvaluationQueryKeys.all });
}

export function getPartnerSupplierEvalKpiQueryKey(partnerId: string) {
  return supplierEvaluationQueryKeys.partnerKpi(partnerId);
}

export function getPartnerInitialEvalQueryKey(partnerId: string) {
  return supplierEvaluationQueryKeys.partnerInitial(partnerId);
}
