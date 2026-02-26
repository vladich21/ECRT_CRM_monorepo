import { Reference } from './referenceTypes';

export interface Partner {
  id: string;
  short_name: string;
  name: string;
  comment: string;

  status_id: string;
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

  created_at: string;
  updated_at: string;
}

export interface PartnerContact {
  id: string;
  partner_id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
  is_primary: true;
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
  color_bg: string;
  color_text: string;
  color_border: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerEconomicCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Типы для SupplierRatingRecord были удалены вместе с функциональностью /supplier_ratings
