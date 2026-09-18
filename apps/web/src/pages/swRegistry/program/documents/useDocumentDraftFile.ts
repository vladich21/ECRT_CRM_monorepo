import { useEffect, useRef, useState } from 'react';

import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { startSwDocumentDraftUpload, type SwDraftUpload } from '@/api/swRegistry/uploadSwFile';
import type { SvnEntry } from '@/components/svnPicker/svnApi';
import type { CreateSwDocumentPayload } from '@/types/swRegistry';

import { isDocumentIdTakenError, storedSvnFileFromError, type SwStoredSvnFile } from './swDocumentCreateWarnings';

export type FileSource = 'svn' | 'upload';

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string; size: number; percent: number; fileId?: string }
  | { status: 'done'; filename: string; size: number; fileId: string; versionId: string }
  | { status: 'error'; filename: string; message: string; fileId?: string };

function newDocumentId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uploadedFileId(state: UploadState): string | undefined {
  return state.status === 'idle' ? undefined : state.fileId;
}

/**
 * Файл создаваемого документа: он едет в хранилище до того, как документ появился,
 * поэтому у окна есть свой зарезервированный id документа, отмена отзывает залитое,
 * а перенесённый из SVN файл переиспользуется при повторе.
 */
export function useDocumentDraftFile(input: {
  open: boolean;
  itemId: string;
  svnEnabled: boolean;
  submitError?: unknown;
  /** Имя выбранного файла: по нему окно подставляет реквизиты документа. */
  onFilename: (filename: string) => void;
}) {
  const { open, itemId, svnEnabled, submitError, onFilename } = input;

  const [documentId, setDocumentId] = useState(newDocumentId);
  const [source, setSource] = useState<FileSource>(svnEnabled ? 'svn' : 'upload');
  const [svnFile, setSvnFile] = useState<SvnEntry | null>(null);
  const [svnPickerOpen, setSvnPickerOpen] = useState(false);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const uploadHandle = useRef<SwDraftUpload | null>(null);
  /** Файл из SVN, уже перенесённый бэком при отказе создания: повтор берёт его, а не качает заново. */
  const storedSvn = useRef<SwStoredSvnFile | null>(null);

  useEffect(() => {
    if (!open) return;
    setDocumentId(newDocumentId());
    setSource(svnEnabled ? 'svn' : 'upload');
    setSvnFile(null);
    setUpload({ status: 'idle' });
    uploadHandle.current = null;
    storedSvn.current = null;
  }, [open, svnEnabled]);

  const discardUpload = (state: UploadState) => {
    const fileId = uploadedFileId(state);
    if (fileId) void swRegistryApi.discardDocumentUpload(itemId, fileId).catch(() => undefined);
  };

  const discardStoredSvn = () => {
    const stored = storedSvn.current;
    storedSvn.current = null;
    if (stored) void swRegistryApi.discardDocumentUpload(itemId, stored.fileId).catch(() => undefined);
  };

  // Отказ создания. Файл из SVN, который бэк уже перенёс, запоминаем для повтора. Занятый id документа
  // (случайное совпадение) — резервируем новый; файлы записаны на прежний id, поэтому выбрать их заново.
  useEffect(() => {
    if (submitError == null) return;
    const stored = storedSvnFileFromError(submitError);
    if (stored) {
      storedSvn.current = stored;
      return;
    }
    if (isDocumentIdTakenError(submitError)) {
      uploadHandle.current?.abort();
      uploadHandle.current = null;
      discardUpload(upload);
      discardStoredSvn();
      setUpload({ status: 'idle' });
      setSvnFile(null);
      setDocumentId(newDocumentId());
    }
  }, [submitError]);

  const startUpload = (file: File) => {
    uploadHandle.current?.abort();
    discardUpload(upload);
    setUpload({ status: 'uploading', filename: file.name, size: file.size, percent: 0 });
    onFilename(file.name);

    // Ответы прежней (заменённой или отменённой) загрузки могут прийти позже — применяем только текущую.
    const isCurrent = () => uploadHandle.current === handle && !handle.isAborted();
    const handle = startSwDocumentDraftUpload(file, {
      itemId,
      documentId,
      onTicket: ticket => {
        if (!isCurrent()) return;
        setUpload(current => (current.status === 'uploading' ? { ...current, fileId: ticket.fileId } : current));
      },
      onProgress: percent => {
        if (!isCurrent()) return;
        setUpload(current => (current.status === 'uploading' ? { ...current, percent } : current));
      },
    });
    uploadHandle.current = handle;
    handle.promise
      .then(ticket => {
        if (!isCurrent()) return;
        setUpload({ status: 'done', filename: file.name, size: file.size, ...ticket });
      })
      .catch(() => {
        if (!isCurrent()) return;
        setUpload(current => ({
          status: 'error',
          filename: file.name,
          message: 'Не удалось загрузить файл — выберите его ещё раз',
          fileId: uploadedFileId(current),
        }));
      });
  };

  const changeSource = (next: FileSource) => {
    if (next === source) return;
    // Файл прежнего источника никому не нужен — сразу от него отказываемся.
    uploadHandle.current?.abort();
    discardUpload(upload);
    discardStoredSvn();
    setUpload({ status: 'idle' });
    setSource(next);
  };

  /** Отмена окна: залитое и перенесённое из SVN не должно осиротеть в хранилище. */
  const discardAll = () => {
    uploadHandle.current?.abort();
    discardUpload(upload);
    discardStoredSvn();
  };

  const pickSvnFile = (entry: SvnEntry) => {
    if (storedSvn.current && storedSvn.current.path !== entry.path) discardStoredSvn();
    setSvnFile(entry);
    setSvnPickerOpen(false);
    onFilename(entry.name);
  };

  /** Что отправляем в создание: перенесённый файл переиспользуем, иначе бэк качает сам. */
  const filePayload = (): CreateSwDocumentPayload['file'] => {
    if (source === 'svn') {
      if (!svnFile) return undefined as never;
      const stored = storedSvn.current?.path === svnFile.path ? storedSvn.current : null;
      return stored
        ? {
            source: 'svn',
            path: svnFile.path,
            storedFileId: stored.fileId,
            revision: stored.revision,
            repoUuid: stored.repoUuid,
          }
        : { source: 'svn', path: svnFile.path };
    }
    return upload.status === 'done'
      ? { source: 'upload', fileId: upload.fileId, versionId: upload.versionId, filename: upload.filename }
      : (undefined as never);
  };

  return {
    documentId,
    source,
    changeSource,
    upload,
    startUpload,
    svnFile,
    svnPickerOpen,
    setSvnPickerOpen,
    pickSvnFile,
    discardAll,
    filePayload,
    fileReady: source === 'svn' ? Boolean(svnFile) : upload.status === 'done',
  };
}
