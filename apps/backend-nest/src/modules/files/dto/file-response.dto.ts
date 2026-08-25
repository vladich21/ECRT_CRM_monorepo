export interface FileResponseDto {
  id: string;
  entitytype: string;
  name: string;
  document_section: string;
  size: string | null;
  url: string;
  uploadedby_id: string | null;
  uploaded_at: string | null;
  response_required: boolean;
  response_deadline: string | null;
  version: number;
  is_current: boolean;
  /** local | files_service — откуда отдаются байты. */
  storage_backend: string;
  external_file_id: string | null;
}

export interface UploadItemDto {
  name: string;
  size: string;
  type: string;
  url: string;
}
