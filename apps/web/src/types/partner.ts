import { Reference } from './referenceTypes';

export type PartnerEvaluationRequired = 'none' | 'missing' | 'overdue';

export interface PartnerExportFileLink {
  name: string;
  url: string;
}

export interface PartnerExportExtras {
  contacts_summary: string;
  primary_contact_name: string;
  primary_contact_position: string;
  primary_contact_phone: string;
  primary_contact_email: string;
  contracts_summary: string;
  contracts_count: number;
  legal_verification_files: string;
  legal_verification_file_links: PartnerExportFileLink[];
  questionnaire_files: string;
  questionnaire_file_links: PartnerExportFileLink[];
  partner_files: string;
  partner_file_links: PartnerExportFileLink[];
  avg_project_score: number | null;
  next_reevaluation_date: string | null;
  initial_evaluation_score: number | null;
  blocked_projects_count: number;
}

export interface Partner {
  id: string;
  short_name: string;
  name: string;
  comment: string;
  status_id: string;
  category_id: string;
  partner_economic_category_id: string;
  type_ids: Array<string>;
  competence_ids: Array<string>;
  legal_address: string;
  actual_address: string;
  phone: string;
  email: string;
  website: string;
  kpp: string;
  inn: string;
  ogrn: string;
  is_key_supplier: boolean;
  is_targeted: boolean;
  legal_check_passed: boolean;
  questionnaire_filled: boolean;
  initial_assessment_done: boolean;
  is_approved: boolean;
  has_active_evaluation_block?: boolean;
  evaluation_required?: PartnerEvaluationRequired;
  rating: number | null;
  next_audit_date: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  export_extras?: PartnerExportExtras;
}
export interface PartnerCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
export interface PartnerContact {
  id: string;
  partner_id: string;
  full_name: string;
  position: string;
  phone: string;
  phone_ext: string;
  email: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
export interface PartnerType {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
export interface PartnerStatus {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
export interface PartnerCompetence {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
export interface PartnerEconomicCategory {
  id: string;
  name: string;
  code?: string;
  description: string;
  created_at: string;
  updated_at: string;
}
