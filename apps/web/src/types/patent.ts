export interface Patent {
  id: string;
  registration_number: string;
  registration_date: string;
  registration_number_cir: string;
  registration_date_cir: string;
  application_number: string;
  name: string;
  department_id: string;
  author_ids: Array<string>;
  area_ids: Array<string>;
  contract_id: string;
  project_id: string;
  responsible_for_patenting_id: string;
  kd_number: string;
  intellectprop_id: string;
  status_id: string;
  is_deleted: boolean;

  created_at: string;
  updated_at: string;
  created_by: number;
}

export interface PatentArea {
  id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface PatentGrant {
  id: string;
  patent_id: string;
  grant_number: string;
  grant_date?: string;
  office?: string;
  status: string;
  renewal_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
