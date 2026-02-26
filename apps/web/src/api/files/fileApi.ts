import { MyFile } from '../../types/files';
import { apiClient, fileClient } from '../clients';

export const fileApi = {
  getFilesByEntity: async (entityType: string, entityId: string): Promise<MyFile[]> => {
    const response = await apiClient.get(`/${entityType}s/${entityId}/files`);
    return response.data;
  },

  uploadFiles: async (formData: FormData): Promise<void> => {
    const response = await fileClient.post(`/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (entityType: string, entityId: string, fileId: string): Promise<void> => {
    const response = await apiClient.delete(`/${entityType}s/${entityId}/files/${fileId}`);
    return response.data;
  },
};
