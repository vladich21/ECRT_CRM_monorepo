/** Файлы записей реестра: тикеты, подтверждение, ссылки. */

import { apiClient } from '../clients';
import type {
  SwFileLinkResponse,
  SwRegistryFile,
} from '@/types/swRegistry';

export const swFilesApi = {
  listFiles: async (objectType: string, objectId: string): Promise<SwRegistryFile[]> => {
    const { data } = await apiClient.get<SwRegistryFile[]>('/sw/files', {
      params: { objectType, objectId },
    });
    return data;
  },

  createSwFileTicket: async (payload: {
    objectType: string;
    objectId: string;
    purpose: string;
    filename: string;
    contentType?: string;
  }) => {
    const { data } = await apiClient.post<{
      fileId: string;
      versionId: string;
      version: number;
      upload: { tusEndpoint: string; metadata: Record<string, string> };
    }>('/sw/files/ticket', payload);
    return data;
  },

  createSwFileVersionTicket: async (
    fileId: string,
    payload: { filename?: string; contentType?: string },
  ) => {
    const { data } = await apiClient.post<{
      fileId: string;
      versionId: string;
      version: number;
      upload: { tusEndpoint: string; metadata: Record<string, string> };
    }>(`/sw/files/${fileId}/version-ticket`, payload);
    return data;
  },

  confirmSwFile: async (
    fileId: string,
    payload: {
      objectType: string;
      objectId: string;
      purpose: string;
      filename: string;
      versionId?: string;
      replace?: boolean;
    },
  ) => {
    const { data } = await apiClient.post(`/sw/files/${fileId}/confirm`, payload);
    return data;
  },

  getSwFileLink: async (fileId: string, version?: number): Promise<SwFileLinkResponse> => {
    const { data } = await apiClient.get<SwFileLinkResponse>(`/sw/files/${fileId}/link`, {
      params: version != null ? { version } : undefined,
    });
    return data;
  },

  detachSwFile: async (linkId: string) => {
    await apiClient.delete(`/sw/files/${linkId}`);
  },
};
