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
  /** replace — замена копии: прежние файлы записи снимаются (у документа копия одна). */
  attach: async (input: {
    objectType: string;
    objectId: string;
    path: string;
    replace?: boolean;
  }): Promise<SvnAttachResult> => {
    const { data } = await apiClient.post<SvnAttachResult>('/sw/registry/svn/attach', input);
    return data;
  },
};
