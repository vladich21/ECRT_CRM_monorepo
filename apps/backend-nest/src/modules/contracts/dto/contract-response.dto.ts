export interface ContractResponseDto {
  id: string;
  number: string;
  cipher: string;
  name: string;
  description: string;
  partner_id: string;
  project_id: string;
  responsible_id: string;

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

  created_at: string;
  updated_at: string;
}