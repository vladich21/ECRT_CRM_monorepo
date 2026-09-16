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

export type SwDraftUploadTicket = { fileId: string; versionId: string };

export type SwDraftUpload = {
  promise: Promise<SwDraftUploadTicket>;
  abort: () => void;
  isAborted: () => boolean;
};

/**
 * Загрузка файла для документа, которого ещё нет: тикет записывает файл на зарезервированный id,
 * документ с привязкой создаётся потом одним запросом. Подтверждения нет — его заменяет создание.
 * `onTicket` отдаёт fileId сразу: при отмене окна от файла надо отказаться, даже если он не догрузился.
 */
export function startSwDocumentDraftUpload(
  file: File,
  opts: {
    itemId: string;
    documentId: string;
    onTicket?: (ticket: SwDraftUploadTicket) => void;
    onProgress?: (percent: number) => void;
  },
): SwDraftUpload {
  let upload: Upload | null = null;
  let aborted = false;

  const promise = (async () => {
    const ticket = await swRegistryApi.createDocumentUploadTicket(opts.itemId, {
      documentId: opts.documentId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    });
    if (aborted) {
      // Отменили, пока выдавался тикет: fileId знаем только мы — отказываемся от файла сами, иначе он осиротеет.
      void swRegistryApi.discardDocumentUpload(opts.itemId, ticket.fileId).catch(() => undefined);
      throw new Error('upload aborted');
    }
    opts.onTicket?.({ fileId: ticket.fileId, versionId: ticket.versionId });

    await new Promise<void>((resolve, reject) => {
      const tus = new Upload(file, {
        endpoint: ticket.upload.tusEndpoint,
        metadata: ticket.upload.metadata,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        removeFingerprintOnSuccess: true,
        onProgress: (sent, total) => {
          if (!aborted) opts.onProgress?.(total > 0 ? Math.floor((sent / total) * 100) : 0);
        },
        onError: error => reject(error),
        onSuccess: () => resolve(),
      });
      upload = tus;
      tus.start();
    });

    return { fileId: ticket.fileId, versionId: ticket.versionId };
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      void (upload as Upload | null)?.abort(true);
    },
    isAborted: () => aborted,
  };
}

/** Куски по 64 МиБ: прошивка на 10 ГБ одним запросом не пролезает через прокси и не переживает обрыв. */
const FIRMWARE_CHUNK_SIZE = 64 * 1024 * 1024;

/**
 * Загрузка прошивки: файл едет в хранилище до создания записи. Прошивки весят гигабайты,
 * поэтому окно показывает прогресс, а отмена отзывает уже зарезервированный файл.
 */
export function startSwFirmwareUpload(
  file: File,
  opts: {
    itemId: string;
    onTicket?: (ticket: SwDraftUploadTicket) => void;
    onProgress?: (percent: number) => void;
  },
): SwDraftUpload {
  let upload: Upload | null = null;
  let aborted = false;

  const promise = (async () => {
    const ticket = await swRegistryApi.createFirmwareUploadTicket({
      itemId: opts.itemId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    });
    if (aborted) {
      void swRegistryApi.discardFirmwareUpload(ticket.fileId).catch(() => undefined);
      throw new Error('upload aborted');
    }
    opts.onTicket?.({ fileId: ticket.fileId, versionId: ticket.versionId });

    await new Promise<void>((resolve, reject) => {
      const tus = new Upload(file, {
        endpoint: ticket.upload.tusEndpoint,
        metadata: ticket.upload.metadata,
        chunkSize: FIRMWARE_CHUNK_SIZE,
        retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
        removeFingerprintOnSuccess: true,
        onProgress: (sent, total) => {
          if (!aborted) opts.onProgress?.(total > 0 ? Math.floor((sent / total) * 100) : 0);
        },
        onError: error => reject(error),
        onSuccess: () => resolve(),
      });
      upload = tus;
      tus.start();
    });

    return { fileId: ticket.fileId, versionId: ticket.versionId };
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      void (upload as Upload | null)?.abort(true);
    },
    isAborted: () => aborted,
  };
}
