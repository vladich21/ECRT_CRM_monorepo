export interface Contract {
  id: string;
  number: string;
  cipher: string;
  name: string;
  description: string;
  partner_id: string;
  project_id: string;
  responsible_id: string;
  supplier_manager_id?: string | null;
  category_id: string;
  contract_type_id: string;
  amount_excl_vat: number;
  vat_rate: number;
  amount_vat: number;
  amount_incl_vat: number;
  start_date: string;
  end_date: string;
  date_signed: string;
  state_id: string;
  is_active: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}
export interface ContractType {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}
export interface ContractStage {
  id: string;
  name: string;
  stage_number: number;
  responsible_id: string;
  contract_id: string;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  planned_budget: number;
  forecasted_budget: number;
  actual_budget: number;
  state_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}
export interface ContractState {
  id: string;
  name: string;
  code: string;
}
export type ContractStageState = ContractState;
export type ContractRevision = Contract & {
  contract_id: string;
  revision_number: number;
  stages: ContractStage[];
};
