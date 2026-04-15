export interface MyFile {
  id: string;
  entitytype: string;
  name: string;
  /** Для патентов: application | consent | notification; иначе обычно default */
  document_section?: string;
  size: string | null;
  url: string;
  uploadedby_id: string | null;
  uploaded_at: string | null;
}
