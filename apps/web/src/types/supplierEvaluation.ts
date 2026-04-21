export type SupplierEvaluationStatus = 'active' | 'archived';
export type SupplierEvaluationCategory = 'A' | 'B' | 'C' | 'D';

export interface SupplierEvaluationCriterion {
  id: string;
  code: string;
  name: string;
  description: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SupplierEvaluationListItem {
  id: string;
  partner_id: string;
  partner_name?: string;
  project_id: string;
  status: SupplierEvaluationStatus;
  weighted_score: number;
  category: SupplierEvaluationCategory;
  evaluated_at: string;
  next_reevaluation_date: string | null;
  comment: string;
  created_by: string;
  created_by_name?: string;
  updated_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface SupplierEvaluationScoreDetail {
  id: string;
  criterion_id: string;
  score: number;
  criterion_code: string;
  criterion_name: string;
  criterion_weight: number;
  sort_order: number;
  weighted_line?: number;
}

export interface SupplierEvaluationDetail extends SupplierEvaluationListItem {
  scores: SupplierEvaluationScoreDetail[];
}

export interface SupplierEvaluationListResponse {
  data: SupplierEvaluationListItem[];
  total: number;
}

export interface SupplierEvaluationContractProjectOption {
  id: string;
  label: string;
}

export interface SupplierEvaluationBlock {
  id: string;
  partner_id: string;
  project_id: string;
  source_evaluation_id: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateSupplierEvaluationPayload {
  partner_id: string;
  project_id: string;
  evaluated_at: string;
  comment?: string;
  scores: { criterion_id: string; score: number }[];
}

export interface InitialSupplierEvaluation {
  id: string;
  partner_id: string;
  status: SupplierEvaluationStatus;
  weighted_score: number;
  category: SupplierEvaluationCategory;
  evaluated_at: string;
  next_reevaluation_date: string | null;
  comment: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateInitialSupplierEvaluationPayload {
  partner_id: string;
  evaluated_at: string;
  comment?: string;
  scores: { criterion_id: string; score: number }[];
}

export type SupplierEvaluationUiStatusParam =
  | 'all'
  | 'current'
  | 'archived'
  | 'blocked'
  | 'overdue'
  | 'reeval_soon';

export type SupplierEvaluationSortField = 'evaluated_at' | 'weighted_score';
export type SupplierEvaluationSortDir = 'asc' | 'desc';

export type SupplierEvaluationTabCounts = Record<SupplierEvaluationUiStatusParam, number>;
