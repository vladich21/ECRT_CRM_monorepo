import { MyFile } from '../../types/files';
import { apiClient } from '../clients';
import { parseUploadFormData, uploadFileViaFilesService } from './uploadRemote';

export const fileApi = {
  getFilesByEntity: async (entityType: string, entityId: string): Promise<MyFile[]> => {
    const response = await apiClient.get(`/${entityType}s/${entityId}/files`);
    return response.data;
  },

  /**
   * Новые загрузки идут в files-service (prepare → tus → complete).
   * Сигнатура FormData сохранена: вкладки/комментарии/партнёры не меняются.
   */
  uploadFiles: async (formData: FormData): Promise<MyFile[]> => {
    const { files, meta } = parseUploadFormData(formData);
    if (!meta.entityType || !meta.entityId) {
      throw new Error('entityType и entityId обязательны');
    }
    const uploaded: MyFile[] = [];
    for (const file of files) {
      uploaded.push(await uploadFileViaFilesService(file, meta));
    }
    return uploaded;
  },

  deleteFile: async (entityType: string, entityId: string, fileId: string): Promise<void> => {
    const response = await apiClient.delete(`/${entityType}s/${entityId}/files/${fileId}`);
    return response.data;
  },

  patchFileMeta: async (
    entityType: string,
    entityId: string,
    fileId: string,
    body: { responseRequired?: boolean; responseDeadline?: string | null },
  ): Promise<MyFile> => {
    const response = await apiClient.patch(`/${entityType}s/${entityId}/files/${fileId}`, body);
    return response.data;
  },
};
