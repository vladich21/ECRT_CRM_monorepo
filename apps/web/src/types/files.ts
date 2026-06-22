export interface MyFile {
  id: string;
  entitytype: string;
  name: string;
  document_section?: string;
  size: string | null;
  url: string;
  uploadedby_id: string | null;
  uploaded_at: string | null;
  response_required?: boolean;
  response_deadline?: string | null;
  /** Версионность (F-V0/F-V1): номер версии набора и принадлежность к текущей версии. */
  version?: number;
  is_current?: boolean;
}
