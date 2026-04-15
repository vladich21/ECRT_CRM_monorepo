export type PatentGrantListPreviewItem = {
  grant_number: string;
  grant_date?: string;
  office?: string;
  status?: string;
};

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

  patent_grants_count?: number;
  patent_grants_preview?: PatentGrantListPreviewItem[];

  /** Целевой РИД при статусе «Преобразование». */
  transformed_into_patent_id?: string;
  /** Исходный РИД, если эта запись создана как продолжение преобразования. */
  transformed_from_patent_id?: string;
  transformation_notification_ic_zht?: string;
  transformation_notification_cir?: string;
  /** Подпись для ссылки (из GET детали). */
  transformation_target_registration_number?: string;
  transformation_source_registration_number?: string;
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
  patent_name?: string;
  patent_registration_number?: string;
}
