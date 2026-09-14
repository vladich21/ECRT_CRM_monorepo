import { apiClient } from '@/api/clients';

export type SvnEntry = {
  name: string;
  kind: 'file' | 'dir';
  path: string;
  size: number | null;
  revision: number | null;
  author: string | null;
  date: string | null;
};

export type SvnAttachResult = { fileId: string; filename: string; revision: number };

export type SvnFolderFile = {
  name: string;
  path: string;
  revision: number | null;
  size: number | null;
  /** Обозначение документа, к которому файл уже прикреплён, либо null. */
  attachedTo: string | null;
  attachedRevision: number | null;
};

export type SvnFolderState = { svnPath: string | null; files: SvnFolderFile[] };

export const svnApi = {
  status: async (): Promise<{ enabled: boolean }> => {
    const { data } = await apiClient.get<{ enabled: boolean }>('/sw/registry/svn/status');
    return data;
  },
  browse: async (path: string): Promise<SvnEntry[]> => {
    const { data } = await apiClient.get<SvnEntry[]>('/sw/registry/svn/browse', { params: { path } });
    return data;
  },
  /** Текущие ревизии в SVN для набора путей. */
  revisions: async (paths: string[]): Promise<Record<string, number>> => {
    const { data } = await apiClient.post<Record<string, number>>('/sw/registry/svn/revisions', { paths });
    return data;
  },
  /** Привязать программу к её каталогу в SVN. */
  link: async (input: { itemId: string; path: string }): Promise<{ itemId: string; svnPath: string }> => {
    const { data } = await apiClient.post<{ itemId: string; svnPath: string }>('/sw/registry/svn/link', input);
    return data;
  },
  /** Что лежит в каталоге программы и что из этого заведено в реестр. */
  folder: async (itemId: string): Promise<SvnFolderState> => {
    const { data } = await apiClient.get<SvnFolderState>('/sw/registry/svn/folder', { params: { itemId } });
    return data;
  },
  attach: async (input: { objectType: string; objectId: string; path: string }): Promise<SvnAttachResult> => {
    const { data } = await apiClient.post<SvnAttachResult>('/sw/registry/svn/attach', input);
    return data;
  },
};
