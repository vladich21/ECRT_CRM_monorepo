import { Upload } from 'tus-js-client';

import type { MyFile } from '../../types/files';
import { apiClient } from '../clients';

type PrepareRemoteResponse = {
  file: MyFile;
  remote: {
    fileId: string;
    versionId: string;
    upload: {
      tusEndpoint: string;
      metadata: {
        filename: string;
        fileId: string;
        versionId: string;
      };
    };
  };
};

type CompleteRemoteResponse = {
  file: MyFile;
  remoteStatus: string;
  rejectReason?: string | null;
};

export type RemoteUploadMeta = {
  entityType: string;
  entityId: string;
  documentSection?: string;
  responseRequired?: boolean;
  responseDeadline?: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function uploadViaTus(
  file: File,
  endpoint: string,
  metadata: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint,
      metadata,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      removeFingerprintOnSuccess: true,
      onError: error => {
        reject(error);
      },
      onSuccess: () => {
        resolve();
      },
    });
    upload.start();
  });
}

async function waitUntilReady(localFileId: string): Promise<MyFile> {
  for (let i = 0; i < 40; i++) {
    const { data } = await apiClient.post<CompleteRemoteResponse>(
      `/upload/complete/${localFileId}`,
    );
    if (data.remoteStatus === 'ready') return data.file;
    if (data.remoteStatus === 'rejected' || data.remoteStatus === 'failed') {
      throw new Error(data.rejectReason || `Загрузка отклонена: ${data.remoteStatus}`);
    }
    await sleep(300);
  }
  throw new Error('Файловый сервис не подтвердил готовность файла');
}

export async function uploadFileViaFilesService(
  file: File,
  meta: RemoteUploadMeta,
): Promise<MyFile> {
  const { data } = await apiClient.post<PrepareRemoteResponse>('/upload/prepare', {
    entityType: meta.entityType,
    entityId: meta.entityId,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    documentSection: meta.documentSection,
    responseRequired: meta.responseRequired,
    responseDeadline: meta.responseDeadline ?? undefined,
  });

  await uploadViaTus(file, data.remote.upload.tusEndpoint, data.remote.upload.metadata);
  return waitUntilReady(data.file.id);
}

export function parseUploadFormData(formData: FormData): {
  files: File[];
  meta: RemoteUploadMeta;
} {
  const files: File[] = [];
  for (const value of formData.values()) {
    if (value instanceof File) files.push(value);
  }
  const entityType = String(formData.get('entityType') ?? '');
  const entityId = String(formData.get('entityId') ?? '');
  const documentSection = formData.get('documentSection');
  const responseRequiredRaw = formData.get('responseRequired');
  const responseDeadline = formData.get('responseDeadline');
  return {
    files,
    meta: {
      entityType,
      entityId,
      documentSection: typeof documentSection === 'string' ? documentSection : undefined,
      responseRequired:
        responseRequiredRaw === 'true' ||
        responseRequiredRaw === '1' ||
        responseRequiredRaw === true,
      responseDeadline: typeof responseDeadline === 'string' ? responseDeadline : null,
    },
  };
}
