import { EMPTY_DELETION_TAB_COUNTS, type DeletionScope, type DeletionTabCounts } from '../../constants/deletionScope';
import { Partner } from '../../types/partner';
import { readAxiosLikeError } from '../../utils/readAxiosLikeError';
import { apiClient } from '../clients';

export type PartnersTabCounts = {
  all: number;
  ready: number;
  in_progress: number;
  key_supplier: number;
};

export interface PartnersListResponse {
  data: Partner[];
  total: number;
  tab_counts: PartnersTabCounts;
  deletion_tab_counts: DeletionTabCounts;
}

export type PartnerSyncRunResult = {
  startedAt: string;
  finishedAt: string;
  sourceFromTs: string;
  savedLastSyncTs: string;
  loadedFromThesis: number;
  skippedByThesisId: number;
  created: number;
  linked: number;
  errors: string[];
};

export type PartnerSyncStatusResponse = {
  running: boolean;
  last_sync_ts: string | null;
  updated_at: string | null;
  result: unknown;
};

export type PartnerListTriStateParam = 'yes' | 'no';

export type PartnerListSortBy =
  | 'name'
  | 'created_at'
  | 'weighted_score'
  | 'next_reevaluation_date'
  | 'status_name';

export interface PartnerListParams {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: 'all' | 'ready' | 'in_progress';
  deletedScope?: DeletionScope;
  evaluationCategories?: ('A' | 'B' | 'C' | 'D' | 'none')[];
  categoryIds?: string[];
  evaluationRequired?: PartnerListTriStateParam;
  isKeySupplier?: PartnerListTriStateParam;
  isTargeted?: PartnerListTriStateParam;
  reevaluationOverdue?: PartnerListTriStateParam;
  hasActiveBlocks?: PartnerListTriStateParam;
  isApproved?: PartnerListTriStateParam;
  legalCheckPassed?: PartnerListTriStateParam;
  questionnaireFilled?: PartnerListTriStateParam;
  initialAssessmentDone?: PartnerListTriStateParam;
  sortBy?: PartnerListSortBy;
  sortOrder?: 'asc' | 'desc';
}

export const partnerApi = {
  getPartners: async (filters?: PartnerListParams, limit = 20, offset = 0): Promise<PartnersListResponse> => {
    const evaluationCategoriesParam = filters?.evaluationCategories?.length
      ? filters.evaluationCategories.map(c => (c === 'none' ? 'none' : c)).join(',')
      : undefined;
    const response = await apiClient.get('/partners', {
      params: {
        limit,
        offset,
        deleted_scope: filters?.deletedScope ?? 'active',
        search: filters?.search || undefined,
        type_ids: filters?.typeIds?.length ? filters.typeIds.join(',') : undefined,
        status_ids: filters?.statusIds?.length ? filters.statusIds.join(',') : undefined,
        competence_ids: filters?.competenceIds?.length ? filters.competenceIds.join(',') : undefined,
        readiness: filters?.readiness && filters.readiness !== 'all' ? filters.readiness : undefined,
        evaluation_categories: evaluationCategoriesParam,
        category_ids: filters?.categoryIds?.length ? filters.categoryIds.join(',') : undefined,
        evaluation_required: filters?.evaluationRequired,
        is_key_supplier: filters?.isKeySupplier,
        is_targeted: filters?.isTargeted,
        reevaluation_overdue: filters?.reevaluationOverdue,
        has_active_blocks: filters?.hasActiveBlocks,
        is_approved: filters?.isApproved,
        legal_check_passed: filters?.legalCheckPassed,
        questionnaire_filled: filters?.questionnaireFilled,
        initial_assessment_done: filters?.initialAssessmentDone,
        sort_by: filters?.sortBy,
        sort_order: filters?.sortOrder,
      },
    });
    const responseBody = response.data as PartnersListResponse;
    const tabCounts = responseBody.tab_counts;
    return {
      ...responseBody,
      tab_counts: {
        all: tabCounts?.all ?? 0,
        ready: tabCounts?.ready ?? 0,
        in_progress: tabCounts?.in_progress ?? 0,
        key_supplier: tabCounts?.key_supplier ?? 0,
      },
      deletion_tab_counts: responseBody.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS,
    };
  },
  getPartnersForReference: async (opts?: { excludeArchived?: boolean }): Promise<Partner[]> => {
    const response = await apiClient.get('/partners', {
      params: {
        preview: 1,
        preview_exclude_archived: opts?.excludeArchived ? 1 : undefined,
      },
    });
    return response.data.data ?? response.data;
  },
  getPartnerById: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.get(`/partners/${partnerId}`);
    return response.data[0];
  },
  getPartnerDataByInn: async (partnerInn: string): Promise<Partner> => {
    const response = await apiClient.get('/partners/inn-lookup', {
      params: { inn: partnerInn },
    });
    return response.data;
  },
  addPartner: async (data: Partner): Promise<Partner> => {
    try {
      const response = await apiClient.post('/partners', data);
      if (Array.isArray(response.data)) {
        if (response.data[0]?.error) throw new Error(response.data[0].error.msg);
      } else if (response.data?.error) {
        throw new Error(response.data.error.msg);
      } else if (typeof response.data === 'string' && response.data.includes('error')) {
        throw new Error(response.data);
      }
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error: unknown) {
      const { httpStatus, message } = readAxiosLikeError(error);
      if (httpStatus === 403) {
        throw new Error(
          message ?? 'Создание контрагентов напрямую ограничено. Используйте Тезис.',
        );
      }
      throw error instanceof Error ? error : new Error('Не удалось создать контрагента');
    }
  },
  editPartner: async (partnerId: string, data: Partial<Partner>): Promise<Partner> => {
    const response = await apiClient.put(`/partners/${partnerId}`, data);
    return response.data[0];
  },
  deletePartner: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.delete(`/partners/${partnerId}`);
    const body = response.data;
    return Array.isArray(body) ? body[0] : body;
  },
  restorePartner: async (partnerId: string): Promise<Partner> => {
    const response = await apiClient.put(`/partners/${partnerId}/restore`);
    return response.data[0];
  },
  syncPartnersNow: async (): Promise<PartnerSyncRunResult> => {
    const response = await apiClient.post('/partner-sync/sync');
    return response.data;
  },
  getPartnerSyncStatus: async (): Promise<PartnerSyncStatusResponse> => {
    const response = await apiClient.get('/partner-sync/status');
    return response.data;
  },
};
