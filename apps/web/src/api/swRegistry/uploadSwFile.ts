import { Upload } from 'tus-js-client';

import type { SwFileObjectType, SwFilePurpose } from '../../types/swRegistry';
import { swDocumentsApi } from '@/api/swRegistry/documents';
import { swFilesApi } from '@/api/swRegistry/files';
import { swFirmwaresApi } from '@/api/swRegistry/firmwares';

export type SwFileUploadMeta = {
  objectType: SwFileObjectType;
  objectId: string;
  purpose: SwFilePurpose;
  /** Замена копии: прежние файлы записи снимаются вместе с файлами в хранилище. */
  replace?: boolean;
};

function uploadViaTus(file: File, endpoint: string, metadata: Record<string, string>): Promise<void> {
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
  const ticket = await swFilesApi.createSwFileTicket({
    objectType: meta.objectType,
    objectId: meta.objectId,
    purpose: meta.purpose,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  await uploadViaTus(file, ticket.upload.tusEndpoint, ticket.upload.metadata);
  await swFilesApi.confirmSwFile(ticket.fileId, {
    objectType: meta.objectType,
    objectId: meta.objectId,
    purpose: meta.purpose,
    filename: file.name,
    versionId: ticket.versionId,
    replace: meta.replace,
  });

  return ticket.fileId;
}

export async function uploadSwRegistryFileVersion(
  file: File,
  remoteFileId: string,
  meta: SwFileUploadMeta,
): Promise<void> {
  const ticket = await swFilesApi.createSwFileVersionTicket(remoteFileId, {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  await uploadViaTus(file, ticket.upload.tusEndpoint, ticket.upload.metadata);
  await swFilesApi.confirmSwFile(remoteFileId, {
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

type DraftUploadTicketResponse = SwDraftUploadTicket & {
  upload: { tusEndpoint: string; metadata: Record<string, string> };
};

/**
 * Загрузка файла на зарезервированный id: запись с привязкой создаётся потом, одним запросом.
 * Отличаются только тикет, отказ от него и настройки передачи, поэтому ход у обеих загрузок общий.
 * `onTicket` отдаёт fileId сразу: при отмене окна от файла надо отказаться, даже если он не догрузился.
 */
function startDraftUpload(
  file: File,
  opts: {
    createTicket: () => Promise<DraftUploadTicketResponse>;
    /** Отменили, пока выдавался тикет: fileId знаем только мы — отказываемся от файла сами. */
    discardTicket: (fileId: string) => void;
    tusOptions?: { chunkSize?: number; retryDelays?: number[] };
    onTicket?: (ticket: SwDraftUploadTicket) => void;
    onProgress?: (percent: number) => void;
  },
): SwDraftUpload {
  let upload: Upload | null = null;
  let aborted = false;

  const promise = (async () => {
    const ticket = await opts.createTicket();
    if (aborted) {
      opts.discardTicket(ticket.fileId);
      throw new Error('upload aborted');
    }
    opts.onTicket?.({ fileId: ticket.fileId, versionId: ticket.versionId });

    await new Promise<void>((resolve, reject) => {
      const tus = new Upload(file, {
        endpoint: ticket.upload.tusEndpoint,
        metadata: ticket.upload.metadata,
        retryDelays: opts.tusOptions?.retryDelays ?? [0, 1000, 3000, 5000, 10000],
        ...(opts.tusOptions?.chunkSize ? { chunkSize: opts.tusOptions.chunkSize } : {}),
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
      // Приведение типа: внутри промиса upload уже присвоен, но для TS он так и остался null.
      void (upload as Upload | null)?.abort(true);
    },
    isAborted: () => aborted,
  };
}

/**
 * Загрузка файла для документа, которого ещё нет. Подтверждения нет — его заменяет создание документа.
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
  return startDraftUpload(file, {
    createTicket: () =>
      swDocumentsApi.createDocumentUploadTicket(opts.itemId, {
        documentId: opts.documentId,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      }),
    discardTicket: fileId => void swDocumentsApi.discardDocumentUpload(opts.itemId, fileId).catch(() => undefined),
    onTicket: opts.onTicket,
    onProgress: opts.onProgress,
  });
}

/** Куски по 64 МиБ: прошивка на 10 ГБ одним запросом не пролезает через прокси и не переживает обрыв. */
const FIRMWARE_CHUNK_SIZE = 64 * 1024 * 1024;

/**
 * Загрузка прошивки: файл едет в хранилище до создания записи. Прошивки весят гигабайты,
 * поэтому передача идёт кусками, а повторов при обрыве больше.
 */
export function startSwFirmwareUpload(
  file: File,
  opts: {
    itemId: string;
    onTicket?: (ticket: SwDraftUploadTicket) => void;
    onProgress?: (percent: number) => void;
  },
): SwDraftUpload {
  return startDraftUpload(file, {
    createTicket: () =>
      swFirmwaresApi.createFirmwareUploadTicket({
        itemId: opts.itemId,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      }),
    discardTicket: fileId => void swFirmwaresApi.discardFirmwareUpload(fileId).catch(() => undefined),
    tusOptions: { chunkSize: FIRMWARE_CHUNK_SIZE, retryDelays: [0, 1000, 3000, 5000, 10000, 20000] },
    onTicket: opts.onTicket,
    onProgress: opts.onProgress,
  });
}
