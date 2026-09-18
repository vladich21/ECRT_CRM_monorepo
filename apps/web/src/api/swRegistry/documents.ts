/** Комплект документации: создание с файлом, статусы, архив. */

import { apiClient } from '../clients';
import type {
  ChangeSwDocumentStatusPayload,
  CreateSwDocumentPayload,
  SwDocumentStatusesResponse,
  SwDocumentWriteResult,
  UpdateSwDocumentPayload,
} from '@/types/swRegistry';

export const swDocumentsApi = {
  createDocument: async (
    itemId: string,
    payload: CreateSwDocumentPayload,
  ): Promise<SwDocumentWriteResult> => {
    const { data } = await apiClient.post(`/sw/items/detail/${itemId}/documents`, payload);
    return data;
  },

  /** Тикет на загрузку файла ещё не созданного документа: файл сразу записан на его будущий id. */
  createDocumentUploadTicket: async (
    itemId: string,
    payload: { documentId: string; filename: string; contentType?: string },
  ) => {
    const { data } = await apiClient.post<{
      documentId: string;
      fileId: string;
      versionId: string;
      upload: { tusEndpoint: string; metadata: Record<string, string> };
    }>(`/sw/items/detail/${itemId}/documents/upload-ticket`, payload);
    return data;
  },

  /** Отказ от загруженного файла, который так и не стал документом (окно закрыли). */
  discardDocumentUpload: async (itemId: string, fileId: string) => {
    await apiClient.delete(`/sw/items/detail/${itemId}/documents/upload-ticket/${fileId}`);
  },

  getDocumentStatuses: async (id: string): Promise<SwDocumentStatusesResponse> => {
    const { data } = await apiClient.get<SwDocumentStatusesResponse>(`/sw/documents/detail/${id}/statuses`);
    return data;
  },

  changeDocumentStatus: async (id: string, payload: ChangeSwDocumentStatusPayload) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/status`, payload);
    return data;
  },

  updateDocument: async (id: string, payload: UpdateSwDocumentPayload): Promise<SwDocumentWriteResult> => {
    const { data } = await apiClient.patch(`/sw/documents/detail/${id}`, payload);
    return data;
  },

  markDocumentDeleted: async (id: string) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/mark-deleted`);
    return data;
  },

  archiveDocument: async (id: string) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/archive`);
    return data;
  },

  restoreDocument: async (id: string) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/restore`);
    return data;
  },
};
