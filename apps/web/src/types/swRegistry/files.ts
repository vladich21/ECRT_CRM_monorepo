/** Файлы записей реестра: версии, ссылки на скачивание. */

export type SwFileObjectType = 'sw_item' | 'sw_document' | 'sw_sheet';

export type SwFilePurpose = 'document' | 'sheet' | 'spec';

export type SwFileVersion = {
  id: string;
  version: number;
  status: string;
  sizeBytes: number | null;
  rejectReason: string | null;
  createdAt?: string;
};

export type SwRegistryFile = {
  id: string;
  fileId: string;
  purpose: SwFilePurpose;
  filename: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  currentVersion: number | null;
  versions: SwFileVersion[];
  /** Происхождение из SVN конструкторов: путь, ревизия переноса, репозиторий. */
  svnPath?: string | null;
  svnRevision?: number | null;
  svnRepoUuid?: string | null;
};

export type SwFileLinkResponse = {
  fileId: string;
  version: number | null;
  url: string;
  expiresAt: string;
};
