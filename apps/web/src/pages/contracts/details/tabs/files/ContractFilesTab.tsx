import { useEffect, useState } from 'react';
import {
  Upload,
  Card,
  Typography,
  Button,
  Tooltip,
  Spin,
} from 'antd';
import {
  InboxOutlined,
  CloudUploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { fileApi } from '../../../../../api/files/fileApi';
import { useFilesByEntity, useDeleteFile } from '../../../../../api/files/fileApiHooks';
import { useReferenceData } from '../../../../../api/hooks/useReferences';
import { getNameById } from '../../../../../helpers/getNameById';
import { useNotification } from '../../../../../customhooks/useNotification';
import { useConfirmByModal } from '../../../../../customhooks/useConfirmByModal';
import { triggerFileDownload } from '../../../../../components/filePreview/FilePreviewModal';
import type { MyFile } from '../../../../../types/files';
import styles from './ContractFilesTab.module.scss';

const { Text, Title } = Typography;
const { Dragger } = Upload;


function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')   return <FilePdfOutlined className={styles.iconPdf} />;
  if (['doc', 'docx'].includes(ext)) return <FileWordOutlined className={styles.iconWord} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined className={styles.iconExcel} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImageOutlined className={styles.iconImage} />;
  return <FileOutlined className={styles.iconDefault} />;
}

function formatFileSize(size: string | null): string {
  if (!size) return '—';
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

export function ContractFilesTab() {
  const { contractId } = useParams();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string>('');

  const { contextHolder, showNotification } = useNotification();

  const { data: files = [], isLoading } = useFilesByEntity('contract', contractId!);
  const { data: referenceBooks } = useReferenceData(['users']);
  const deleteFileMutation = useDeleteFile();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteFileMutation,
    successMessage: 'Файл успешно удалён',
    errorMessage: 'Не удалось удалить файл',
    getMutationProps: () => ({
      entityType: 'contract',
      entityId: contractId!,
      fileId: currentFileId,
    }),
    showNotification,
  });

  useEffect(() => {
    if (currentFileId) openDeleteModal();
  }, [currentFileId]);

  const handleUpload = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;
    const sizeStr = String(uploadFile.size);
    if (files.some(f => f.name === uploadFile.name && String(f.size) === sizeStr)) {
      showNotification('warning', 'Внимание', 'Файл с таким именем и размером уже загружен');
      onError?.(new Error('Duplicate file'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file1', uploadFile);
      formData.append('entityType', 'contract');
      formData.append('entityId', contractId!);
      await fileApi.uploadFiles(formData);
      await queryClient.invalidateQueries({ queryKey: ['files', 'contract', contractId] });
      onSuccess?.('ok');
      showNotification('success', 'Готово', 'Файл загружен');
    } catch {
      onError?.(new Error('Upload failed'));
      showNotification('error', 'Ошибка', 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const handleFileClick = (file: MyFile) => {
    triggerFileDownload(file.url, file.name);
  };

  const hasFiles = files.length > 0;

  const draggerProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    customRequest: handleUpload,
    accept: '*',
  };

  return (
    <div className={styles.pageWrap}>
      {contextHolder}

      {!hasFiles ? (
        <Dragger {...draggerProps} className={styles.draggerEmpty} disabled={uploading}>
          <div className={styles.emptyWrap}>
            <InboxOutlined className={styles.draggerIcon} />
            <Title level={5} style={{ margin: '8px 0 2px' }}>
              Перетащите файлы сюда
            </Title>
            <Text type="secondary">или нажмите для выбора файлов с устройства</Text>
          </div>
        </Dragger>
      ) : (
        <Dragger {...draggerProps} className={styles.draggerCompact} disabled={uploading}>
          <CloudUploadOutlined className={styles.draggerIconSmall} />
          <Text type="secondary" style={{ fontSize: 14 }}>
            Перетащите файлы или{' '}
            <Text style={{ color: '#002f55', fontWeight: 500 }}>выберите с устройства</Text>
          </Text>
        </Dragger>
      )}

      {hasFiles && (
        <div className={styles.sectionHeader}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {files.length}{' '}
            {files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}
          </Text>
        </div>
      )}

      <Spin spinning={isLoading || uploading}>
        {hasFiles && (
          <div className={styles.fileGrid}>
            {files.map((file) => (
              <Card
                key={file.id}
                size="small"
                className={styles.fileCard}
                styles={{ body: { padding: '12px' } }}
                onClick={() => handleFileClick(file)}
              >
                <div className={styles.fileCardInner}>
                  <div className={styles.fileIconRow}>
                    <span className={styles.fileIconWrap}>{getFileIcon(file.name)}</span>
                    <span className={styles.fileName}>{file.name}</span>
                  </div>

                  <div className={styles.fileMeta}>
                    <span className={styles.fileMetaRow}>
                      <FileOutlined style={{ fontSize: 12 }} />
                      {formatFileSize(file.size)}
                    </span>
                    {file.uploaded_at && (
                      <span className={styles.fileMetaRow}>
                        <CalendarOutlined style={{ fontSize: 12 }} />
                        {formatDate(file.uploaded_at)}
                      </span>
                    )}
                    {file.uploadedby_id && (
                      <span className={styles.fileMetaRow}>
                        <UserOutlined style={{ fontSize: 12 }} />
                        {getNameById(file.uploadedby_id, referenceBooks?.users ?? []) || '—'}
                      </span>
                    )}
                  </div>

                  <div className={styles.fileActions}>
                    <Tooltip title="Удалить">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleteFileMutation.isPending && currentFileId === file.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentFileId(file.id);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}
