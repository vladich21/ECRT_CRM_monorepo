/** Типы ответов files-service (HTTP /api/v1). */

export type FilesServicePrepareResponse = {
  fileId: string;
  versionId: string;
  version: number;
  status: 'pending';
  upload: {
    tusEndpoint: string;
    metadata: {
      filename: string;
      fileId: string;
      versionId: string;
    };
  };
};

export type FilesServiceVersionStatus = 'pending' | 'ready' | 'rejected' | 'failed';

export type FilesServiceFileResponse = {
  id: string;
  originalName: string;
  contentType: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  currentVersion: {
    id: string;
    version: number;
    status: FilesServiceVersionStatus;
    originalName: string;
    contentType: string | null;
    sha256: string | null;
    sizeBytes: number | null;
    rejectReason: string | null;
  } | null;
};

export type FilesServiceSignedLinkResponse = {
  token: string;
  url: string;
  expiresAt: string;
};

export type PrepareRemoteFileInput = {
  filename: string;
  contentType?: string;
  entityType?: string;
  entityId?: string;
  createdBy?: string;
  expectedSha256?: string;
};

export type FilesServiceListQuery = {
  entityType?: string;
  entityId?: string;
  status?: 'open' | 'deleted' | 'all';
  page?: number;
  limit?: number;
};

export type FilesServiceListItem = {
  id: string;
  originalName: string;
  contentType: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  versionsCount: number;
  createdAt: string;
};

export type FilesServiceListResponse = {
  items: FilesServiceListItem[];
  total: number;
  page: number;
  limit: number;
};
