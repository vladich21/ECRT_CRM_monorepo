import type { DeletedScope, DeletionTabCounts } from '../../../common/deleted-scope';

export type PartnerListTabScope = 'all' | 'ready' | 'in_progress' | 'key_supplier';

export type PartnerListTriState = 'yes' | 'no' | 'all';

export type PartnerListSortField =
  | 'name'
  | 'created_at'
  | 'weighted_score'
  | 'next_reevaluation_date'
  | 'status_name';

export type PartnerListSortOrder = 'asc' | 'desc';

export type PartnerEvaluationCategoryFilterToken = 'A' | 'B' | 'C' | 'D' | 'none';
export type PartnerEvaluationRequiredValue = 'none' | 'missing' | 'overdue';

export interface PartnerQueryFilters {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: PartnerListTabScope;
  deletedScope?: DeletedScope;
  evaluationCategories?: PartnerEvaluationCategoryFilterToken[];
  categoryIds?: string[];
  categoryIdsIncludeNull?: boolean;
  evaluationRequired?: PartnerListTriState;
  isKeySupplier?: PartnerListTriState;
  isTargeted?: PartnerListTriState;
  reevaluationOverdue?: PartnerListTriState;
  hasActiveBlocks?: PartnerListTriState;
  isApproved?: PartnerListTriState;
  legalCheckPassed?: PartnerListTriState;
  questionnaireFilled?: PartnerListTriState;
  initialAssessmentDone?: PartnerListTriState;
  sortBy?: PartnerListSortField;
  sortOrder?: PartnerListSortOrder;
  previewExcludeArchived?: boolean;
}

export interface PartnersListPayload {
  data: unknown[];
  total: number;
  tab_counts: {
    all: number;
    ready: number;
    in_progress: number;
    key_supplier: number;
  };
  deletion_tab_counts: DeletionTabCounts;
}
