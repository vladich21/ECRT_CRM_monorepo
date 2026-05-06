import { useRef, useState } from 'react';
import {
  CalendarOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  InboxOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Spin, Tooltip, Typography, Upload } from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useNavigate, useParams } from 'react-router-dom';

import { fileApi } from '../../api/files/fileApi';
import { useDeleteFile, useFilesByEntity } from '../../api/files/fileApiHooks';
import { fileQueryKeys } from '../../api/files/fileQueryKeys';
import { useReferenceData } from '../../api/hooks/useReferences';
import { openAntdDeleteConfirm } from '../../customhooks/confirmDelete';
import { useNotification } from '../../customhooks/useNotification';
import { getNameById } from '../../helpers/getNameById';
import type { MyFile } from '../../types/files';
import { formatFileSizeStr } from '../../utils/formatFileSize';
import { triggerFileDownload } from '../filePreview/FilePreviewModal';
import styles from './EntityFilesTab.module.scss';
import {
  PATENT_FILE_SECTIONS,
  patentSectionForFile,
} from './patentFileSections';

const { Text, Title } = Typography;
const { Dragger } = Upload;

export type EntityFileSectionDef = {
  key: string;
  title: string;
  hint: string;
};

interface EntityFilesTabProps {
  entityType: string;
  patentFileSections?: boolean;
  /** Категории документов; ключ = document_section на сервере (как у патентов). */
  documentSections?: readonly EntityFileSectionDef[];
}

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return <FilePdfOutlined className={styles.iconPdf} />;
  if (['doc', 'docx'].includes(ext)) return <FileWordOutlined className={styles.iconWord} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined className={styles.iconExcel} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext))
    return <FileImageOutlined className={styles.iconImage} />;
  return <FileOutlined className={styles.iconDefault} />;
}

function formatFileDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function resolveGenericSectionKey(
  document_section: string | null | undefined,
  allowedKeys: readonly string[],
): string {
  const raw = (document_section ?? '').trim();
  if (allowedKeys.includes(raw)) return raw;
  return allowedKeys[0]!;
}

export function EntityFilesTab({ entityType, patentFileSections, documentSections }: EntityFilesTabProps) {
  const params = useParams();
  const navigate = useNavigate();
  const entityId = params[`${entityType}Id`] as string;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const pendingDeleteId = useRef<string>('');
  const { contextHolder, showNotification } = useNotification();
  const { data: files = [], isLoading } = useFilesByEntity(entityType, entityId);
  const { data: referenceBooks } = useReferenceData(['users']);
  const deleteFileMutation = useDeleteFile();

  const sections: readonly EntityFileSectionDef[] | null = documentSections?.length
    ? documentSections
    : patentFileSections
      ? PATENT_FILE_SECTIONS
      : null;

  const sectionKeyForFile = (document_section: string | null | undefined): string => {
    if (!sections?.length) return 'default';
    if (patentFileSections) return patentSectionForFile(document_section);
    const keys = sections.map(s => s.key);
    return resolveGenericSectionKey(document_section, keys);
  };

  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    pendingDeleteId.current = fileId;
    openAntdDeleteConfirm({
      mutation: deleteFileMutation,
      getVariables: () => ({
        entityType,
        entityId,
        fileId: pendingDeleteId.current,
      }),
      showNotification,
      successMessage: 'Файл успешно удалён',
      errorMessage: 'Не удалось удалить файл',
      navigate,
    });
  };

  const handleUpload =
    (sectionKey?: string) => async (options: UploadRequestOption) => {
      const { file, onSuccess, onError } = options;
      const uploadFile = file as File;
      const sizeStr = String(uploadFile.size);
      const scopeFiles =
        sections && sectionKey
          ? files.filter(f => sectionKeyForFile(f.document_section) === sectionKey)
          : files;
      if (scopeFiles.some(f => f.name === uploadFile.name && String(f.size) === sizeStr)) {
        showNotification('warning', 'Внимание', 'Файл с таким именем и размером уже загружен в этом разделе');
        onError?.(new Error('Duplicate file'));
        return;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file1', uploadFile);
        formData.append('entityType', entityType);
        formData.append('entityId', entityId);
        if (sections && sectionKey) {
          formData.append('documentSection', sectionKey);
        }
        await fileApi.uploadFiles(formData);
        await queryClient.invalidateQueries({ queryKey: fileQueryKeys.byEntity(entityType, entityId) });
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

  const draggerBaseProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    accept: '*' as const,
  };

  const renderFileCard = (file: MyFile) => (
    <Card
      key={file.id}
      size='small'
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
            {formatFileSizeStr(file.size)}
          </span>
          {file.uploaded_at && (
            <span className={styles.fileMetaRow}>
              <CalendarOutlined style={{ fontSize: 12 }} />
              {formatFileDate(file.uploaded_at)}
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
          <Tooltip title='Удалить'>
            <Button
              type='text'
              size='small'
              danger
              icon={<DeleteOutlined />}
              loading={deleteFileMutation.isPending && pendingDeleteId.current === file.id}
              onClick={e => handleDelete(e, file.id)}
            />
          </Tooltip>
        </div>
      </div>
    </Card>
  );

  if (sections) {
    return (
      <div className={styles.pageWrap}>
        {contextHolder}
        <Spin spinning={isLoading || uploading}>
          <div className={styles.sectionsStack}>
            {sections.map(section => {
              const sectionFiles = files.filter(f => sectionKeyForFile(f.document_section) === section.key);
              const sectionHasFiles = sectionFiles.length > 0;
              const headingId = `entity-files-${entityType}-${section.key}`;
              return (
                <section key={section.key} className={styles.sectionBlock} aria-labelledby={headingId}>
                  <Title level={5} id={headingId} className={styles.sectionTitle}>
                    {section.title}
                  </Title>
                  <Text type='secondary' className={styles.sectionHint}>
                    {section.hint}
                  </Text>
                  {!sectionHasFiles ? (
                    <Dragger
                      {...draggerBaseProps}
                      customRequest={handleUpload(section.key)}
                      className={styles.draggerEmpty}
                      disabled={uploading}
                    >
                      <div className={styles.emptyWrap}>
                        <InboxOutlined className={styles.draggerIcon} />
                        <Title level={5} style={{ margin: '8px 0 2px' }}>
                          Перетащите файлы в «{section.title}»
                        </Title>
                        <Text type='secondary'>или нажмите для выбора файлов с устройства</Text>
                      </div>
                    </Dragger>
                  ) : (
                    <Dragger
                      {...draggerBaseProps}
                      customRequest={handleUpload(section.key)}
                      className={styles.draggerCompact}
                      disabled={uploading}
                    >
                      <CloudUploadOutlined className={styles.draggerIconSmall} />
                      <Text type='secondary' style={{ fontSize: 14 }}>
                        Добавить в «{section.title}»: перетащите или{' '}
                        <Text style={{ color: '#002f55', fontWeight: 500 }}>выберите с устройства</Text>
                      </Text>
                    </Dragger>
                  )}
                  {sectionHasFiles && (
                    <>
                      <div className={styles.sectionHeader}>
                        <Text type='secondary' style={{ fontSize: 14 }}>
                          {sectionFiles.length}{' '}
                          {sectionFiles.length === 1 ? 'файл' : sectionFiles.length < 5 ? 'файла' : 'файлов'}
                        </Text>
                      </div>
                      <div className={styles.sectionFileGrid}>{sectionFiles.map(renderFileCard)}</div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </Spin>
      </div>
    );
  }

  const draggerProps = {
    ...draggerBaseProps,
    customRequest: handleUpload(),
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
            <Text type='secondary'>или нажмите для выбора файлов с устройства</Text>
          </div>
        </Dragger>
      ) : (
        <Dragger {...draggerProps} className={styles.draggerCompact} disabled={uploading}>
          <CloudUploadOutlined className={styles.draggerIconSmall} />
          <Text type='secondary' style={{ fontSize: 14 }}>
            Перетащите файлы или <Text style={{ color: '#002f55', fontWeight: 500 }}>выберите с устройства</Text>
          </Text>
        </Dragger>
      )}

      {hasFiles && (
        <div className={styles.sectionHeader}>
          <Text type='secondary' style={{ fontSize: 14 }}>
            {files.length} {files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}
          </Text>
        </div>
      )}

      <Spin spinning={isLoading || uploading}>
        {hasFiles && <div className={styles.fileGrid}>{files.map(renderFileCard)}</div>}
      </Spin>
    </div>
  );
}
