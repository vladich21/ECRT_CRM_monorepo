import { useRef, useState } from 'react';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  FileOutlined,
  HistoryOutlined,
  InboxOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Spin, Typography, Upload } from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useNavigate } from 'react-router-dom';

import {
  useDetachSwFile,
  useSwFiles,
} from '@/api/swRegistry/swRegistryApiHooks';
import { uploadSwRegistryFile, uploadSwRegistryFileVersion } from '@/api/swRegistry/uploadSwFile';
import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { useOpenAntdDeleteConfirm } from '@/customhooks/confirmDelete';
import { getApiErrorMessage } from '@/customhooks/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { SwFileObjectType, SwFilePurpose, SwRegistryFile } from '@/types/swRegistry';
import { formatFileSize } from '@/utils/formatFileSize';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import styles from './SwFilesTab.module.scss';

const { Text, Title } = Typography;
const { Dragger } = Upload;

type SwFilesTabProps = {
  objectType: SwFileObjectType;
  objectId: string;
  purpose: SwFilePurpose;
  title: string;
  hint?: string;
  canEdit?: boolean;
  /** Узкое место (панель программы у дерева): файл одной строкой, зона загрузки в одну строку. */
  compact?: boolean;
};

function getFileIconClass(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return styles.iconPdf;
  if (['doc', 'docx'].includes(ext)) return styles.iconWord;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return styles.iconExcel;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return styles.iconImage;
  return styles.iconDefault;
}

function formatBytes(sizeBytes: number | null | undefined): string {
  if (sizeBytes == null) return '—';
  return formatFileSize(sizeBytes);
}

function formatFileDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function FileVersions({ file, onDownload }: { file: SwRegistryFile; onDownload: (version?: number) => void }) {
  if (file.versions.length <= 1) return null;
  return (
    <div className={styles.versionList}>
      {file.versions.map(version => (
        <button
          key={version.id}
          type='button'
          className={styles.versionRow}
          onClick={() => onDownload(version.version)}
        >
          <HistoryOutlined />
          <span>v{version.version}</span>
          <span>{formatBytes(version.sizeBytes)}</span>
          <span>{formatFileDate(version.createdAt)}</span>
        </button>
      ))}
    </div>
  );
}

export function SwFilesTab({
  objectType,
  objectId,
  purpose,
  title,
  hint,
  canEdit = false,
  compact = false,
}: SwFilesTabProps) {
  const navigate = useNavigate();
  const { data: files = [], isLoading, isError, refetch } = useSwFiles(objectType, objectId);
  const detachMut = useDetachSwFile();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const { contextHolder, showNotification } = useNotification();
  const [uploading, setUploading] = useState(false);
  const pendingDeleteId = useRef('');
  const versionInputRef = useRef<HTMLInputElement>(null);
  const versionTargetRef = useRef<SwRegistryFile | null>(null);

  const meta = { objectType, objectId, purpose };

  const handleDownload = async (file: SwRegistryFile, version?: number) => {
    try {
      const link = await swRegistryApi.getSwFileLink(file.fileId, version);
      triggerFileDownload(link.url, file.filename);
    } catch (err) {
      showNotification('error', 'Ошибка', getApiErrorMessage(err) ?? 'Не удалось получить ссылку на файл');
    }
  };

  const handleDelete = (e: React.MouseEvent, linkId: string) => {
    e.stopPropagation();
    pendingDeleteId.current = linkId;
    openDeleteConfirm({
      mutation: detachMut,
      getVariables: () => ({ linkId: pendingDeleteId.current, objectType, objectId }),
      showNotification,
      successMessage: 'Вложение снято',
      errorMessage: 'Не удалось снять вложение',
      navigate,
    });
  };

  const handleUpload = async (options: UploadRequestOption) => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;
    setUploading(true);
    try {
      await uploadSwRegistryFile(uploadFile, meta);
      await refetch();
      onSuccess?.('ok');
      showNotification('success', 'Готово', 'Файл загружен');
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Upload failed'));
      showNotification('error', 'Ошибка', getApiErrorMessage(err) ?? 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const openVersionPicker = (file: SwRegistryFile) => {
    versionTargetRef.current = file;
    versionInputRef.current?.click();
  };

  const handleVersionSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFile = event.target.files?.[0];
    const target = versionTargetRef.current;
    event.target.value = '';
    versionTargetRef.current = null;
    if (!uploadFile || !target) return;

    setUploading(true);
    try {
      await uploadSwRegistryFileVersion(uploadFile, target.fileId, meta);
      await refetch();
      showNotification('success', 'Готово', 'Новая версия файла загружена');
    } catch (err) {
      showNotification('error', 'Ошибка', getApiErrorMessage(err) ?? 'Не удалось загрузить версию');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      className={`${styles.sectionBlock}${compact ? ` ${styles.sectionBlockCompact}` : ''}`}
      aria-labelledby={`sw-files-${purpose}`}
    >
      {contextHolder}
      <input
        ref={versionInputRef}
        type='file'
        hidden
        onChange={handleVersionSelected}
      />

      <Title level={5} id={`sw-files-${purpose}`} className={styles.sectionTitle}>
        {title}
      </Title>
      {hint ? (
        <Text type='secondary' className={styles.sectionHint}>
          {hint}
        </Text>
      ) : null}

      {isLoading ? (
        <Spin size='small' />
      ) : isError ? (
        <div>
          <Text type='danger'>Не удалось загрузить список файлов</Text>
          <Button type='link' size='small' onClick={() => void refetch()}>
            Повторить
          </Button>
        </div>
      ) : files.length === 0 ? (
        <Text type='secondary'>Файлы не приложены</Text>
      ) : (
        <div className={`${styles.fileList}${compact ? ` ${styles.fileListCompact}` : ''}`}>
          {files.map(file => (
            <div key={file.id} className={`${styles.fileCard}${compact ? ` ${styles.fileCardCompact}` : ''}`}>
              <button type='button' className={styles.fileMain} onClick={() => void handleDownload(file)}>
                <FileOutlined className={getFileIconClass(file.filename)} />
                <div className={styles.fileMeta}>
                  <span className={styles.fileName}>{file.filename}</span>
                  <span className={styles.fileSubline}>
                    v{file.currentVersion ?? '—'}
                    {file.versions.at(-1)?.sizeBytes != null
                      ? ` · ${formatBytes(file.versions.at(-1)?.sizeBytes)}`
                      : ''}
                    {' · '}
                    {file.createdByName} · {formatFileDate(file.createdAt)}
                  </span>
                </div>
              </button>
              <div className={styles.fileActions}>
                {canEdit ? (
                  <>
                    <Button
                      type='text'
                      size='small'
                      icon={<UploadOutlined />}
                      loading={uploading}
                      onClick={() => openVersionPicker(file)}
                    >
                      Новая версия
                    </Button>
                    <Button
                      type='text'
                      size='small'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={e => handleDelete(e, file.id)}
                    />
                  </>
                ) : null}
              </div>
              <FileVersions file={file} onDownload={version => void handleDownload(file, version)} />
            </div>
          ))}
        </div>
      )}

      {canEdit && compact ? (
        <Dragger
          multiple={false}
          showUploadList={false}
          disabled={uploading}
          customRequest={handleUpload}
          className={styles.uploadDraggerCompact}
        >
          <span className={styles.compactDropText}>
            <CloudUploadOutlined />
            {uploading ? 'Загрузка…' : 'Перетащите файл или нажмите, чтобы выбрать'}
          </span>
        </Dragger>
      ) : canEdit ? (
        <Dragger
          multiple={false}
          showUploadList={false}
          disabled={uploading}
          customRequest={handleUpload}
          className={styles.uploadDragger}
        >
          <p className='ant-upload-drag-icon'>
            <InboxOutlined />
          </p>
          <p className='ant-upload-text'>
            {uploading ? 'Загрузка…' : 'Перетащите файл или нажмите для выбора'}
          </p>
          <p className='ant-upload-hint'>
            <CloudUploadOutlined /> Загрузка через files-service с докачкой при обрыве
          </p>
        </Dragger>
      ) : null}
    </section>
  );
}

/** Вкладка файлов документа: документ + лист утверждения (если оформлен). */
export function SwDocumentFilesTab({
  documentId,
  hasApprovalSheet,
  canEdit,
  compact,
}: {
  documentId: string;
  hasApprovalSheet: boolean;
  canEdit?: boolean;
  /** Узкое место (боковая панель документа). */
  compact?: boolean;
}) {
  return (
    <>
      <SwFilesTab
        objectType='sw_document'
        objectId={documentId}
        purpose='document'
        title='Файлы документа'
        hint='Электронные копии программного документа'
        canEdit={canEdit}
        compact={compact}
      />
      {hasApprovalSheet ? (
        <SwFilesTab
          objectType='sw_sheet'
          objectId={documentId}
          purpose='sheet'
          title='Файлы листа утверждения'
          hint='Электронные копии листа утверждения'
          canEdit={canEdit}
          compact={compact}
        />
      ) : null}
    </>
  );
}
