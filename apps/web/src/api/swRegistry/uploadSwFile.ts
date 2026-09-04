import { Upload } from 'tus-js-client';

import type { SwFileObjectType, SwFilePurpose } from '../../types/swRegistry';
import { swRegistryApi } from './swRegistryApi';

export type SwFileUploadMeta = {
  objectType: SwFileObjectType;
  objectId: string;
  purpose: SwFilePurpose;
};

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
      onError: error => reject(error),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export async function uploadSwRegistryFile(file: File, meta: SwFileUploadMeta): Promise<string> {
  const ticket = await swRegistryApi.createSwFileTicket({
    objectType: meta.objectType,
    objectId: meta.objectId,
    purpose: meta.purpose,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  await uploadViaTus(file, ticket.upload.tusEndpoint, ticket.upload.metadata);
  await swRegistryApi.confirmSwFile(ticket.fileId, {
    objectType: meta.objectType,
    objectId: meta.objectId,
    purpose: meta.purpose,
    filename: file.name,
    versionId: ticket.versionId,
  });

  return ticket.fileId;
}

export async function uploadSwRegistryFileVersion(
  file: File,
  remoteFileId: string,
  meta: SwFileUploadMeta,
): Promise<void> {
  const ticket = await swRegistryApi.createSwFileVersionTicket(remoteFileId, {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  await uploadViaTus(file, ticket.upload.tusEndpoint, ticket.upload.metadata);
  await swRegistryApi.confirmSwFile(remoteFileId, {
    objectType: meta.objectType,
    objectId: meta.objectId,
    purpose: meta.purpose,
    filename: file.name,
    versionId: ticket.versionId,
  });
}
