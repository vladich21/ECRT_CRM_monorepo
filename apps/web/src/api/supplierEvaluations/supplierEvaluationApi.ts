import { apiClient } from '../clients';
import type { PartnerSupplierEvalKpi } from '../../utils/supplierEvaluationPartnerKpi';
import type {
  CreateSupplierEvaluationPayload,
  SupplierEvaluationBlock,
  SupplierEvaluationContractProjectOption,
  SupplierEvaluationCriterion,
  SupplierEvaluationDetail,
  SupplierEvaluationListResponse,
  SupplierEvaluationTabCounts,
  SupplierEvaluationSortDir,
  SupplierEvaluationSortField,
  SupplierEvaluationUiStatusParam,
  SupplierEvaluationCategory,
} from '../../types/supplierEvaluation';

export type SupplierEvaluationsStatusFilter = 'active' | 'archived' | 'all';

function compactParams(obj: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Record<
    string,
    string | number
  >;
}

export const supplierEvaluationApi = {
  getCriteria: async (): Promise<SupplierEvaluationCriterion[]> => {
    const { data } = await apiClient.get<SupplierEvaluationCriterion[]>('/supplier-evaluations/criteria');
    return Array.isArray(data) ? data : [];
  },

  getPartnerContractProjects: async (partnerId: string): Promise<SupplierEvaluationContractProjectOption[]> => {
    const { data } = await apiClient.get<SupplierEvaluationContractProjectOption[]>(
      '/supplier-evaluations/partner-contract-projects',
      { params: { partner_id: partnerId } },
    );
    return Array.isArray(data) ? data : [];
  },

  getTabCounts: async (params: {
    partner_id?: string;
    project_id?: string;
    created_by?: string;
    category?: SupplierEvaluationCategory;
    evaluated_year?: number;
    evaluated_at_from?: string;
    evaluated_at_to?: string;
  }): Promise<SupplierEvaluationTabCounts> => {
    const { data } = await apiClient.get<SupplierEvaluationTabCounts>('/supplier-evaluations/counts-by-tab', {
      params: compactParams({
        partner_id: params.partner_id,
        project_id: params.project_id,
        created_by: params.created_by,
        category: params.category,
        evaluated_year: params.evaluated_year,
        evaluated_at_from: params.evaluated_at_from,
        evaluated_at_to: params.evaluated_at_to,
      }),
    });
    return (data && typeof data === 'object' ? data : {}) as SupplierEvaluationTabCounts;
  },

  getList: async (
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
  ): Promise<SupplierEvaluationListResponse> => {
    const { data } = await apiClient.get<SupplierEvaluationListResponse>('/supplier-evaluations', {
      params: compactParams({
        partner_id: params.partner_id,
        project_id: params.project_id,
        status: params.status ?? 'all',
        created_by: params.created_by,
        category: params.category,
        evaluated_year: params.evaluated_year,
        evaluated_at_from: params.evaluated_at_from,
        evaluated_at_to: params.evaluated_at_to,
        ui_status: params.ui_status === 'all' ? undefined : params.ui_status,
        sort_field: params.sort_field,
        sort_dir: params.sort_dir,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      }),
    });
    return {
      data: data?.data ?? [],
      total: data?.total ?? 0,
    };
  },

  getById: async (id: string): Promise<SupplierEvaluationDetail | null> => {
    const { data } = await apiClient.get<SupplierEvaluationDetail[]>(`/supplier-evaluations/${id}`);
    const row = Array.isArray(data) ? data[0] : null;
    return row ?? null;
  },

  /** Тело запроса оборачивается в `{ body }` в apiClient interceptor. */
  create: async (payload: CreateSupplierEvaluationPayload): Promise<SupplierEvaluationDetail | null> => {
    const { data } = await apiClient.post<SupplierEvaluationDetail[]>('/supplier-evaluations', payload);
    const row = Array.isArray(data) ? data[0] : null;
    return row ?? null;
  },

  getActiveBlock: async (partnerId: string, projectId: string): Promise<SupplierEvaluationBlock | null> => {
    const { data } = await apiClient.get<SupplierEvaluationBlock[]>('/supplier-evaluations/blocks', {
      params: { partner_id: partnerId, project_id: projectId },
    });
    const row = Array.isArray(data) ? data[0] : null;
    return row ?? null;
  },

  deactivateBlock: async (blockId: string): Promise<SupplierEvaluationBlock | null> => {
    const { data } = await apiClient.put<SupplierEvaluationBlock[]>(
      `/supplier-evaluations/blocks/${blockId}/deactivate`,
      {},
    );
    const row = Array.isArray(data) ? data[0] : null;
    return row ?? null;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/supplier-evaluations/${id}`);
  },
};

/** KPI контрагента по оценкам (один запрос вместо списка на 500 строк). */
export async function fetchPartnerSupplierEvalKpi(partnerId: string): Promise<PartnerSupplierEvalKpi> {
  const { data } = await apiClient.get<{
    avg_score: number | null;
    next_reevaluation_date: string | null;
    next_reevaluation_overdue: boolean;
    blocked_project_count: number;
  }>('/supplier-evaluations/partner-eval-summary', {
    params: { partner_id: partnerId },
  });
  const row = data && typeof data === 'object' ? data : null;
  return {
    avgScore: row?.avg_score ?? null,
    nextReevaluationIso: row?.next_reevaluation_date ?? null,
    nextReevaluationOverdue: row?.next_reevaluation_overdue ?? false,
    blockedProjectCount: row?.blocked_project_count ?? 0,
  };
}
