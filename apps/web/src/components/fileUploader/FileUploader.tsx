import React, { useState, useCallback } from 'react';
import { Upload, Button, message, List, Space, Typography } from 'antd';
import { InboxOutlined, DeleteOutlined, PaperClipOutlined, ClearOutlined } from '@ant-design/icons';
import { ACCEPT_FILE_TYPES } from '../../constants/fileFormats';

const { Dragger } = Upload;
const { Text } = Typography;

interface FileUploadProps {
  isLoading: boolean;
  onConfirm: (data: FileWithId[]) => Promise<void>;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

export interface FileWithId {
  id: string;
  file: File;
}

const FileUpload: React.FC<FileUploadProps> = ({ isLoading, onConfirm }) => {
  const [files, setFiles] = useState<FileWithId[]>([]);

  const handleDragDrop = useCallback(
    (options: any) => {
      const { file, onSuccess, onError } = options;
      const uploadFile = file as File;

      if (files.some(f => f.file.name === uploadFile.name && f.file.size === uploadFile.size)) {
        message.warning('Файл уже добавлен');
        onError?.();
        return;
      }

      setFiles(prev => [...prev, { id: `${uploadFile.name}-${Date.now()}`, file: uploadFile }]);
      onSuccess?.();
    },
    [files],
  );

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    setFiles([]);
    message.info('Список файлов очищен');
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      message.warning('Добавьте хотя бы один файл');
      return;
    }
    await onConfirm(files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Space direction='vertical' style={{ width: '100%' }} size='middle'>
      <Dragger multiple showUploadList={false} customRequest={handleDragDrop} accept={ACCEPT_FILE_TYPES} disabled={isLoading}>
        <p className='ant-upload-drag-icon'>
          <InboxOutlined />
        </p>
        <p className='ant-upload-text'>Нажмите или перетащите файлы в эту область для загрузки</p>
        <p className='ant-upload-hint'>Поддерживается загрузка нескольких файлов</p>
      </Dragger>

      {files.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>Добавленные файлы ({files.length}):</Text>
            <Button type='text' icon={<ClearOutlined />} onClick={clearAllFiles} disabled={isLoading} danger>
              Очистить все
            </Button>
          </div>
          <List
            size='small'
            dataSource={files}
            renderItem={fileWithId => (
              <List.Item
                actions={[
                  <Button
                    type='text'
                    icon={<DeleteOutlined />}
                    onClick={() => removeFile(fileWithId.id)}
                    disabled={isLoading}
                    danger
                  />,
                ]}
              >
                <List.Item.Meta
                  avatar={<PaperClipOutlined />}
                  title={fileWithId.file.name}
                  description={formatFileSize(fileWithId.file.size)}
                />
              </List.Item>
            )}
          />
        </div>
      )}

      <Space>
        <Button
          type='primary'
          onClick={handleUpload}
          loading={isLoading}
          disabled={files.length === 0 || isLoading}
          size='large'
        >
          {isLoading ? 'Загрузка...' : 'Отправить файлы'}
        </Button>
      </Space>
    </Space>
  );
};

export default FileUpload;
