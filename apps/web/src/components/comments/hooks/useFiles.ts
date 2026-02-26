// hooks/useFiles.ts (упрощенная версия)
import { useCallback, useRef, useState } from 'react';
import { message } from 'antd';

export interface AttachedFile {
  id: string;
  file: File;
  url?: string;
}

interface UseFilesReturn {
  attachedFiles: AttachedFile[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  formatFileSize: (bytes: number) => string;
  getFiles: () => File[];
}

export const useFiles = (onAttachFile?: (file: File) => void): UseFilesReturn => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFiles: AttachedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Проверяем, не добавлен ли уже такой файл
        const isDuplicate = attachedFiles.some(
          attachedFile => attachedFile.file.name === file.name && attachedFile.file.size === file.size,
        );

        if (!isDuplicate) {
          newFiles.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            file: file,
          });
        }
      }

      if (newFiles.length > 0) {
        setAttachedFiles(prev => [...prev, ...newFiles]);

        // Вызываем колбэк для каждого нового файла
        newFiles.forEach(newFile => {
          onAttachFile?.(newFile.file);
        });

        message.success(`Добавлено файлов: ${newFiles.length}`);
      } else {
        message.warning('Файлы уже добавлены');
      }

      e.target.value = '';
    },
    [attachedFiles, onAttachFile],
  );

  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  const getFiles = useCallback((): File[] => {
    return attachedFiles.map(attachedFile => attachedFile.file);
  }, [attachedFiles]);

  return {
    attachedFiles,
    fileInputRef,
    handleFileChange,
    removeFile,
    clearFiles,
    formatFileSize,
    getFiles,
  };
};
