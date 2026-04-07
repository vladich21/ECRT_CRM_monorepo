import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isValidUuid } from '../../helpers/isValidUuid';
import type { MyFile } from '../../types/files';
import { fileApi } from './fileApi';
import { fileQueryKeys } from './fileQueryKeys';

interface FileWithId {
  id: string;
  file: File;
}

interface UseUploadFilesProps {
  entityType: string;
  entityId: string;
}

export const useFilesByEntity = (entityType: string, entityId: string) => {
  return useQuery({
    queryKey: fileQueryKeys.byEntity(entityType, entityId),
    queryFn: () => fileApi.getFilesByEntity(entityType, entityId),
    enabled: !!entityType && isValidUuid(entityId),
  });
};

export const useUploadFiles = ({ entityType, entityId }: UseUploadFilesProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (filesToUpload: FileWithId[]): Promise<MyFile[]> => {
      const formData = new FormData();
      filesToUpload.forEach((f, i) => formData.append(`file${i + 1}`, f.file));
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      return fileApi.uploadFiles(formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.byEntity(entityType, entityId),
      });
    },
  });

  return mutation;
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      fileId,
    }: {
      entityType: string;
      entityId: string;
      fileId: string;
    }): Promise<void> => {
      return await fileApi.deleteFile(entityType, entityId, fileId);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.byEntity(variables.entityType, variables.entityId),
      });
    },
  });
};
