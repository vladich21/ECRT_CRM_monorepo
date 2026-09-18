/** Прошивки программы и их сборки. */

import { apiClient } from '../clients';
import type {
  CreateSwFirmwarePayload,
  CreateSwFirmwareVersionPayload,
  SwFirmware,
  SwFirmwareVersion,
} from '@/types/swRegistry';

export const swFirmwaresApi = {
  listFirmwares: async (itemId: string): Promise<SwFirmware[]> => {
    const { data } = await apiClient.get<SwFirmware[]>('/sw/registry/firmwares/list', {
      params: { itemId },
    });
    return data;
  },

  createFirmwareUploadTicket: async (payload: {
    itemId: string;
    filename: string;
    contentType?: string;
  }) => {
    const { data } = await apiClient.post<{
      fileId: string;
      versionId: string;
      upload: { tusEndpoint: string; metadata: Record<string, string> };
    }>('/sw/registry/firmwares/upload-ticket', payload);
    return data;
  },

  discardFirmwareUpload: async (fileId: string) => {
    await apiClient.delete(`/sw/registry/firmwares/upload-ticket/${fileId}`);
  },

  /** Новая прошивка заводится сразу с первой сборкой. */
  createFirmware: async (payload: CreateSwFirmwarePayload): Promise<SwFirmware> => {
    const { data } = await apiClient.post<SwFirmware>('/sw/registry/firmwares', payload);
    return data;
  },

  updateFirmware: async (id: string, payload: { name?: string; note?: string | null }) => {
    const { data } = await apiClient.patch<SwFirmware>(`/sw/registry/firmwares/${id}`, payload);
    return data;
  },

  createFirmwareVersion: async (payload: CreateSwFirmwareVersionPayload): Promise<SwFirmwareVersion> => {
    const { data } = await apiClient.post<SwFirmwareVersion>('/sw/registry/firmwares/versions', payload);
    return data;
  },

  getFirmwareVersionLink: async (
    versionId: string,
  ): Promise<{ fileId: string; url: string; expiresAt: string }> => {
    const { data } = await apiClient.get<{ fileId: string; url: string; expiresAt: string }>(
      `/sw/registry/firmwares/versions/${versionId}/link`,
    );
    return data;
  },

  deleteFirmwareVersion: async (versionId: string) => {
    await apiClient.delete(`/sw/registry/firmwares/versions/${versionId}`);
  },

  deleteFirmware: async (id: string) => {
    await apiClient.delete(`/sw/registry/firmwares/${id}`);
  },
};
