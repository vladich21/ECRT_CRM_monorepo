import { useCallback, useRef, useState } from 'react';
import { message } from 'antd';
import { ACCEPT_FILE_TYPES } from '../../../constants/fileFormats';

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
  acceptFileTypes: string;
}

export const useFiles = (onAttachFile?: (file: File) => void): UseFilesReturn => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const bytesBase = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(bytesBase));
    return parseFloat((bytes / Math.pow(bytesBase, unitIndex)).toFixed(2)) + ' ' + sizes[unitIndex];
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFiles: AttachedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isDuplicate = attachedFiles.some(
          existingFile => existingFile.file.name === file.name && existingFile.file.size === file.size,
        );
        if (!isDuplicate) {
          newFiles.push({ id: `${Date.now()}-${i}`, file });
        }
      }

      if (newFiles.length > 0) {
        setAttachedFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach(attachedFile => onAttachFile?.(attachedFile.file));
        message.success(`Добавлено: ${newFiles.length}`);
      } else if (files.length > 0) {
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
    acceptFileTypes: ACCEPT_FILE_TYPES,
  };
};
