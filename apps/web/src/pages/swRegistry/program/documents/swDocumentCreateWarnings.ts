export type SwDocumentCreateFieldWarnings = {
  designation?: string;
  file?: string;
  documentKindCode?: string;
  withApprovalSheet?: string;
  /** Отказ, который не относится к одному полю: показывается над формой. */
  form?: string;
};

/** Файл из SVN, который бэк уже перенёс в хранилище под создаваемый документ. */
export type SwStoredSvnFile = { fileId: string; path: string; revision: number; repoUuid: string };

export type SwDocumentCreateConflictDetails = {
  code?: string;
  field?: string;
  message?: string;
  occupiedDesignation?: string;
  storedSvnFile?: unknown;
};

const FIELD_KEYS = new Set<keyof SwDocumentCreateFieldWarnings>([
  'designation',
  'file',
  'documentKindCode',
  'withApprovalSheet',
  'form',
]);

export function parseSwDocumentCreateConflict(error: unknown): SwDocumentCreateConflictDetails | null {
  if (!error || typeof error !== 'object' || !('response' in error)) return null;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return null;

  const root = data as { message?: unknown };
  const payload =
    root.message && typeof root.message === 'object' && root.message !== null
      ? (root.message as SwDocumentCreateConflictDetails)
      : (root as SwDocumentCreateConflictDetails);

  if (!payload.code && !payload.field && !payload.message) return null;
  return payload;
}

/** Подсказки у полей после отказа сохранения. Автонумерации нет — номер и обозначение правит человек. */
export function buildDocumentCreateSaveWarnings(error: unknown): SwDocumentCreateFieldWarnings {
  const conflict = parseSwDocumentCreateConflict(error);
  if (!conflict) return {};

  if (conflict.code === 'DOCUMENT_TAKEN') {
    return {
      designation: conflict.occupiedDesignation
        ? `Обозначение «${conflict.occupiedDesignation}» уже занято в реестре — измените номер или обозначение`
        : 'Обозначение уже занято в реестре — измените номер или обозначение',
    };
  }
  const field = conflict.field as keyof SwDocumentCreateFieldWarnings | undefined;
  if (field && FIELD_KEYS.has(field) && typeof conflict.message === 'string') {
    return { [field]: conflict.message };
  }
  // Без поля (сбой сети, хранилища, SVN) — текст уже во всплывающем сообщении.
  return {};
}

/** Перенесённый файл из SVN из ответа на конфликт: повтор «Создать» возьмёт его без повторной скачки. */
export function storedSvnFileFromError(error: unknown): SwStoredSvnFile | null {
  const stored = parseSwDocumentCreateConflict(error)?.storedSvnFile as Partial<SwStoredSvnFile> | undefined;
  if (
    !stored ||
    typeof stored.fileId !== 'string' ||
    typeof stored.path !== 'string' ||
    typeof stored.revision !== 'number' ||
    typeof stored.repoUuid !== 'string'
  ) {
    return null;
  }
  return { fileId: stored.fileId, path: stored.path, revision: stored.revision, repoUuid: stored.repoUuid };
}

export function isDocumentIdTakenError(error: unknown): boolean {
  return parseSwDocumentCreateConflict(error)?.code === 'DOCUMENT_ID_TAKEN';
}
