import { useEffect, useRef, useState } from 'react';
import {
  CalendarOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  InboxOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Modal,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { fileApi } from '../../api/files/fileApi';
import { useDeleteFile, useFilesByEntity, usePatchFileMeta } from '../../api/files/fileApiHooks';
import { fileQueryKeys } from '../../api/files/fileQueryKeys';
import { patentQueryKeys } from '../../api/patents/patentQueryKeys';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useOpenAntdDeleteConfirm } from '../../customhooks/confirmDelete';
import { useNotification } from '../../customhooks/useNotification';
import { getNameById } from '../../helpers/getNameById';
import type { MyFile } from '../../types/files';
import { formatFileSizeStr } from '../../utils/formatFileSize';
import { triggerFileDownload } from '../filePreview/FilePreviewModal';
import styles from './EntityFilesTab.module.scss';
import { PATENT_FILE_SECTIONS_IN_ORDER, patentSectionForFile } from './patentFileSections';

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

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function isPastDeadline(iso: string): boolean {
  return startOfLocalDay(new Date(iso)) < startOfLocalDay(new Date());
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
  const patchMetaMutation = usePatchFileMeta();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<MyFile | null>(null);
  const [editForm] = Form.useForm<{
    responseRequired: boolean;
    responseDeadline: Dayjs | null | undefined;
  }>();

  const [requestMeta, setRequestMeta] = useState<{
    responseRequired: boolean;
    responseDeadline: Dayjs | null;
  }>({ responseRequired: false, responseDeadline: null });

  const gridSections: readonly EntityFileSectionDef[] | null = documentSections?.length
    ? documentSections
    : patentFileSections
      ? PATENT_FILE_SECTIONS_IN_ORDER
      : null;

  const sectionKeyForFile = (document_section: string | null | undefined): string => {
    if (!gridSections) return 'default';
    if (patentFileSections) return patentSectionForFile(document_section);
    const keys = gridSections.map(s => s.key);
    return resolveGenericSectionKey(document_section, keys);
  };

  useEffect(() => {
    if (!editModalOpen || !editingFile) return;
    editForm.setFieldsValue({
      responseRequired: Boolean(editingFile.response_required),
      responseDeadline: editingFile.response_deadline ? dayjs(editingFile.response_deadline) : undefined,
    });
  }, [editModalOpen, editingFile, editForm]);

  const openEditModal = (file: MyFile, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFile(file);
    setEditModalOpen(true);
  };

  const submitEditMeta = async () => {
    if (!editingFile) return;
    try {
      const v = await editForm.validateFields();
      await patchMetaMutation.mutateAsync({
        entityType,
        entityId,
        fileId: editingFile.id,
        body: {
          responseRequired: v.responseRequired,
          responseDeadline: v.responseDeadline ? v.responseDeadline.format('YYYY-MM-DD') : null,
        },
      });
      showNotification('success', 'Готово', 'Параметры запроса обновлены');
      setEditModalOpen(false);
      setEditingFile(null);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      showNotification('error', 'Ошибка', 'Не удалось сохранить параметры');
    }
  };

  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    pendingDeleteId.current = fileId;
    openDeleteConfirm({
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
      const allSectionKeys = gridSections?.map(s => s.key);
      const scopeFiles =
        allSectionKeys && sectionKey
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
        if (sectionKey) {
          formData.append('documentSection', sectionKey);
        }
        if (sectionKey === 'requests') {
          formData.append('responseRequired', String(requestMeta.responseRequired));
          if (requestMeta.responseDeadline) {
            formData.append('responseDeadline', requestMeta.responseDeadline.format('YYYY-MM-DD'));
          }
        }
        await fileApi.uploadFiles(formData);
        await queryClient.invalidateQueries({ queryKey: fileQueryKeys.byEntity(entityType, entityId) });
        if (entityType === 'patent') {
          void queryClient.invalidateQueries({ queryKey: patentQueryKeys.all });
        }
        onSuccess?.('ok');
        showNotification('success', 'Готово', 'Файл загружен');
        if (sectionKey === 'requests') {
          setRequestMeta({ responseRequired: false, responseDeadline: null });
        }
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

  const renderFileCard = (file: MyFile, sectionKey: string) => {
    const isRequests = sectionKey === 'requests';
    return (
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

          {isRequests && (file.response_required || file.response_deadline) ? (
            <div className={styles.requestsFileTags} onClick={e => e.stopPropagation()}>
              {file.response_required ? (
                <Tag bordered={false} className={`${styles.requestTag} ${styles.requestTagWarning}`}>
                  Требуется ответ
                </Tag>
              ) : null}
              {file.response_deadline ? (
                <Tag
                  bordered={false}
                  className={`${styles.requestTag} ${isPastDeadline(file.response_deadline) ? styles.requestTagError : styles.requestTagWarning}`}
                >
                  Срок ответа по запросам: {formatFileDate(file.response_deadline)}
                </Tag>
              ) : null}
            </div>
          ) : null}

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

          <div className={styles.fileActions} onClick={e => e.stopPropagation()}>
            {isRequests ? (
              <Tooltip title='Параметры запроса'>
                <Button
                  type='text'
                  size='small'
                  icon={<EditOutlined />}
                  onClick={e => openEditModal(file, e)}
                />
              </Tooltip>
            ) : null}
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
  };

  if (gridSections) {
    return (
      <div className={styles.pageWrap}>
        {contextHolder}
        <Spin spinning={isLoading || uploading}>
          <>
            <div
              className={`${styles.sectionsStack} ${patentFileSections ? styles.sectionsStackPatent4 : ''}`}
              style={
                !patentFileSections && gridSections.length !== 3
                  ? { gridTemplateColumns: `repeat(${gridSections.length}, minmax(0, 1fr))` }
                  : undefined
              }
            >
              {gridSections.map(section => {
                const isRequests = section.key === 'requests';
                const sectionFiles = files.filter(f => sectionKeyForFile(f.document_section) === section.key);
                const sectionHasFiles = sectionFiles.length > 0;
                const headingId = `entity-files-${entityType}-${section.key}`;

                const withDeadlines = isRequests ? sectionFiles.filter(f => f.response_deadline) : [];
                const earliestMs =
                  isRequests && withDeadlines.length > 0
                    ? Math.min(...withDeadlines.map(f => new Date(f.response_deadline!).getTime()))
                    : null;
                const showRequestsBanner =
                  isRequests &&
                  sectionFiles.length > 0 &&
                  (earliestMs != null || sectionFiles.some(f => f.response_required));
                const bannerDeadlineOverdue =
                  earliestMs != null && isPastDeadline(new Date(earliestMs).toISOString());

                return (
                  <section
                    key={section.key}
                    className={isRequests ? styles.requestsSection : styles.sectionBlock}
                    aria-labelledby={headingId}
                  >
                    <Title level={5} id={headingId} className={styles.sectionTitle}>
                      {section.title}
                    </Title>
                    <Text type='secondary' className={styles.sectionHint}>
                      {section.hint}
                    </Text>

                    {showRequestsBanner ? (
                      <div
                        className={`${styles.requestStatusBanner} ${bannerDeadlineOverdue ? styles.requestStatusBannerOverdue : ''}`}
                      >
                        <SendOutlined className={styles.requestStatusIcon} />
                        <Text className={styles.requestStatusText}>
                          {earliestMs != null ? (
                            <>
                              Срок ответа по запросам:{' '}
                              <strong>{new Date(earliestMs).toLocaleDateString('ru-RU')}</strong>
                            </>
                          ) : (
                            <>По запросам отмечено «требуется ответ» — при необходимости укажите срок</>
                          )}
                        </Text>
                      </div>
                    ) : null}

                    {isRequests ? (
                      <div className={styles.requestUploadBar}>
                        <Checkbox
                          checked={requestMeta.responseRequired}
                          onChange={e => setRequestMeta(m => ({ ...m, responseRequired: e.target.checked }))}
                        >
                          Требуется ответ
                        </Checkbox>
                        <div className={styles.requestDeadlineField}>
                          <span className={styles.requestDeadlineLabel}>Срок ответа</span>
                          <DatePicker
                            value={requestMeta.responseDeadline}
                            onChange={v => setRequestMeta(m => ({ ...m, responseDeadline: v ?? null }))}
                            format='DD.MM.YYYY'
                            placeholder='Не указано'
                            allowClear
                            className={styles.requestDeadlinePicker}
                          />
                        </div>
                      </div>
                    ) : null}

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
                        <div className={styles.sectionFileGrid}>
                          {sectionFiles.map(f => renderFileCard(f, section.key))}
                        </div>
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        </Spin>

        <Modal
          title='Параметры запроса'
          open={editModalOpen}
          onCancel={() => {
            setEditModalOpen(false);
            setEditingFile(null);
          }}
          onOk={submitEditMeta}
          okText='Сохранить'
          confirmLoading={patchMetaMutation.isPending}
          destroyOnHidden
        >
          <Form form={editForm} layout='vertical'>
            <Form.Item name='responseRequired' valuePropName='checked' label='Требуется ответ'>
              <Checkbox />
            </Form.Item>
            <Form.Item name='responseDeadline' label='Срок ответа'>
              <DatePicker format='DD.MM.YYYY' style={{ width: '100%' }} allowClear />
            </Form.Item>
          </Form>
        </Modal>
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
        {hasFiles && <div className={styles.fileGrid}>{files.map(f => renderFileCard(f, 'default'))}</div>}
      </Spin>
    </div>
  );
}
