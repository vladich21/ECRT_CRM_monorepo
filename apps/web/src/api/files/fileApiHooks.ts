import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MyFile } from '../../types/files';
import { fileApi } from '../../api/files/fileApi';
import { isValidUuid } from '../../helpers/isValidUuid';

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
    queryKey: ['files', entityType, entityId],
    queryFn: () => fileApi.getFilesByEntity(entityType, entityId),
    enabled: !!entityType && isValidUuid(entityId),
  });
};

export const useUploadFiles = ({ entityType, entityId }: UseUploadFilesProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (filesToUpload: FileWithId[]): Promise<void> => {
      const formData = new FormData();
      filesToUpload.forEach((f, i) => formData.append(`file${i + 1}`, f.file));
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      return fileApi.uploadFiles(formData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['files', entityType, entityId],
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
      queryClient.invalidateQueries({
        queryKey: ['files', variables.entityType, variables.entityId],
      });
    },
  });
};
