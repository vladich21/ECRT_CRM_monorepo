import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MyFile } from '../../types/files';
import { fileApi } from '../../api/files/fileApi';

interface FileWithId {
  id: string;
  file: File;
}

interface UseUploadFilesProps {
  entityType: string;
  entityId: string;
  onUploadSuccess?: (data: MyFile[]) => void;
  onUploadError?: (error: any) => void;
}

// Хук для получения файлов по сущности
export const useFilesByEntity = (entityType: string, entityId: string) => {
  return useQuery({
    queryKey: ['files', entityType, entityId],
    queryFn: async (): Promise<MyFile[]> => {
      return await fileApi.getFilesByEntity(entityType, entityId);
    },
    enabled: !!entityType && !!entityId,
  });
};

export const useUploadFiles = ({ entityType, entityId, onUploadSuccess, onUploadError }: UseUploadFilesProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (filesToUpload: FileWithId[]): Promise<void> => {
      const formData = new FormData();

      filesToUpload.forEach((fileWithId, i) => {
        formData.append(`file${i + 1}`, fileWithId.file);
      });

      formData.append('entityType', entityType);
      formData.append('entityId', entityId.toString());

      return await fileApi.uploadFiles(formData);
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
