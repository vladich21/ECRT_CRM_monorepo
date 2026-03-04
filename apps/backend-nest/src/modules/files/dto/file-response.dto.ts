export interface FileResponseDto {
  id: string;
  entitytype: string;
  name: string;
  size: string | null;
  url: string;
  uploadedby_id: string | null;
  uploaded_at: string | null;
}

export interface UploadItemDto {
  name: string;
  size: string;
  type: string;
  url: string;
}
