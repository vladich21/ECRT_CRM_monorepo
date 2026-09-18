/** Комплект документации: документ, лист утверждения, статусы, файл при создании. */

import type { SwRecordState } from './common';

export type UpdateSwDocumentPayload = {
  /** Вид и номер у живого документа меняются; без обозначения бэк пересоберёт его из них. */
  documentKindCode?: string;
  kindSequenceNo?: number;
  designation?: string;
  name?: string;
  sheetsCount?: number;
  letter?: string | null;
  approvalSheet?: { designation?: string; sheetsCount?: number } | null;
};

export type SwDocumentListRow = {
  id: string;
  designation: string;
  documentKindCode: string;
  kindSequenceNo: number;
  name: string;
  sheetsCount: number;
  letter: string | null;
  statusCode: string;
  sheetDesignation: string | null;
  sheetSheetsCount: number | null;
  sheetStatusCode: string | null;
  ipsId: string | null;
  ipsPlacedAt: string | null;
  recordState: SwRecordState;
  archivedByCascade?: boolean;
  file?: SwDocumentFileRef | null;
  sheetFile?: SwDocumentFileRef | null;
};

/** Актуальная копия документа или его листа, приходит вместе с комплектом. */
export type SwDocumentFileRef = {
  fileId: string;
  filename: string;
  svnPath: string | null;
  svnRevision: number | null;
};

export type SwDocumentDetail = {
  id: string;
  softwareId: string;
  designation: string;
  documentKindCode: string;
  kindSequenceNo: number;
  name: string;
  sheetsCount: number;
  letter: string | null;
  statusCode: string;
  approvalSheet: { designation: string | null; sheetsCount: number | null; statusCode: string | null } | null;
  ips: { id: string; placedAt: string } | null;
  recordState: SwRecordState;
  archivedByCascade?: boolean;
};

/** POST/PATCH документа: карточка + мягкие предупреждения (префикс обозначения). */
export type SwDocumentWriteResult = SwDocumentDetail & { warnings?: string[] };

export type SwApplicableStatus = {
  code: string;
  name: string;
  requiresIps?: boolean;
  isFinal?: boolean;
};

export type SwDocumentStatusesResponse = {
  document: SwApplicableStatus[];
  sheet: SwApplicableStatus[];
};

/** Файл создаваемого документа: выбранный в SVN или загруженный браузером по тикету. */
export type SwDocumentFileInput =
  /** storedFileId и ревизия — из ответа на конфликт: файл уже перенесён, повтор не качает его снова. */
  | { source: 'svn'; path: string; storedFileId?: string; revision?: number; repoUuid?: string }
  | { source: 'upload'; fileId: string; versionId: string; filename: string };

export type CreateSwDocumentPayload = {
  /** id резервирует окно при открытии: повтор после потерянного ответа не создаёт дубль. */
  id: string;
  /** Документ без файла не создаётся. */
  file: SwDocumentFileInput;
  documentKindCode: string;
  /** Номер задаёт человек или имя файла: автонумерации нет. */
  kindSequenceNo: number;
  designation?: string;
  name?: string;
  sheetsCount: number;
  letter?: string | null;
  approvalSheet?: { designation?: string; sheetsCount?: number };
};

export type ChangeSwDocumentStatusPayload = {
  scope: 'document' | 'sheet';
  statusCode: string;
  comment?: string;
  ips?: { id: string; placedAt: string };
};
