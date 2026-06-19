import { useEffect, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
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
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Spin,
  Tag,
  Tabs,
  theme,
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
import { commentApi } from '../../api/comments/commentApi';
import { commentQueryKeys } from '../../api/comments/commentQueryKeys';
import { patentApi } from '../../api/patents/patentApi';
import { patentQueryKeys } from '../../api/patents/patentQueryKeys';
import { usePatentById, useUpdatePatent } from '../../api/patents/patentApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useOpenAntdDeleteConfirm } from '../../customhooks/confirmDelete';
import { getApiErrorMessage } from '../../customhooks/confirmDelete/getApiErrorMessage';
import { useNotification } from '../../customhooks/useNotification';
import { getNameById } from '../../helpers/getNameById';
import { useCurrentSrmUserId } from '../../hooks/useCurrentSrmUserId';
import type { MyFile } from '../../types/files';
import { formatFileSizeStr } from '../../utils/formatFileSize';
import { triggerFileDownload } from '../filePreview/FilePreviewModal';
import styles from './EntityFilesTab.module.scss';
import {
  PATENT_FILE_APPLICATION_SECTIONS,
  PATENT_FILE_COMMUNICATION_SECTIONS,
  PATENT_FILE_SECTIONS_IN_ORDER,
  patentSectionForFile,
} from './patentFileSections';

const { Text, Title } = Typography;
const { Dragger } = Upload;
type PatentFilesTabKey = 'communication' | 'application';
const DEFAULT_PATENT_FILES_TAB: PatentFilesTabKey = 'application';

function patentFilesTabBySection(sectionKey: string | undefined): PatentFilesTabKey {
  if (!sectionKey) return DEFAULT_PATENT_FILES_TAB;
  if (sectionKey === 'application' || sectionKey === 'consent' || sectionKey === 'notification')
    return 'application';
  return 'communication';
}

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

function shouldNotifyPatentAutoStatus(sectionKey: string | undefined): boolean {
  return (
    sectionKey === 'requests' ||
    sectionKey === 'decision_positive' ||
    sectionKey === 'decision_negative'
  );
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
  const { token } = theme.useToken();
  const params = useParams();
  const navigate = useNavigate();
  const entityId = params[`${entityType}Id`] as string;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const pendingDeleteId = useRef<string>('');
  const { contextHolder, showNotification } = useNotification();
  const currentSrmUserId = useCurrentSrmUserId();
  const { data: files = [], isLoading } = useFilesByEntity(entityType, entityId);
  const { data: patent } = usePatentById(entityType === 'patent' ? entityId : '');
  const updatePatentMutation = useUpdatePatent();
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
  const [copyPromptOpen, setCopyPromptOpen] = useState(false);
  const [copyPromptSubmitting, setCopyPromptSubmitting] = useState(false);
  const [copyPromptStayCurrent, setCopyPromptStayCurrent] = useState(false);
  const [copyPromptComment, setCopyPromptComment] = useState('');
  const [decisionMarkerUpdating, setDecisionMarkerUpdating] = useState<'positive' | 'negative' | null>(
    null,
  );
  const patentTabsStorageKey = `entity-files:${entityType}:${entityId}:patent-active-tab`;
  const [activePatentTab, setActivePatentTab] = useState<PatentFilesTabKey>(() => {
    if (typeof window === 'undefined') return DEFAULT_PATENT_FILES_TAB;
    const savedTab = window.localStorage.getItem(patentTabsStorageKey);
    return savedTab === 'application' || savedTab === 'communication'
      ? savedTab
      : DEFAULT_PATENT_FILES_TAB;
  });

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
    if (!patentFileSections || typeof window === 'undefined') return;
    window.localStorage.setItem(patentTabsStorageKey, activePatentTab);
  }, [activePatentTab, patentFileSections, patentTabsStorageKey]);

  useEffect(() => {
    if (!patentFileSections || typeof window === 'undefined') return;
    const savedTab = window.localStorage.getItem(patentTabsStorageKey);
    setActivePatentTab(
      savedTab === 'application' || savedTab === 'communication' ? savedTab : DEFAULT_PATENT_FILES_TAB,
    );
  }, [patentFileSections, patentTabsStorageKey]);

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
      if (entityType === 'patent') {
        showNotification('info', 'Статус обновлен', 'Статус РИД пересчитан автоматически');
      }
      setEditModalOpen(false);
      setEditingFile(null);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      showNotification(
        'error',
        'Ошибка',
        getApiErrorMessage(e) ?? 'Не удалось сохранить параметры',
      );
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
      successMessage: 'Файл успешно удален',
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
        if (entityType === 'patent' && shouldNotifyPatentAutoStatus(sectionKey)) {
          showNotification(
            'info',
            'Статус обновлен',
            'Статус РИД пересчитан автоматически по действиям в разделе «Файлы»',
          );
        }
        if (entityType === 'patent' && sectionKey === 'decision_negative') {
          openCopyPromptFromRefusal();
        }
        if (patentFileSections && sectionKey) {
          setActivePatentTab(patentFilesTabBySection(sectionKey));
        }
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

  const openCopyPromptFromRefusal = () => {
    setCopyPromptStayCurrent(false);
    setCopyPromptComment('');
    setCopyPromptOpen(true);
  };

  const handleDecisionMarkerChange = async (kind: 'positive' | 'negative', checked: boolean) => {
    if (entityType !== 'patent') return;
    setDecisionMarkerUpdating(kind);
    try {
      const payload =
        kind === 'positive'
          ? {
              decision_positive_marked: checked,
              ...(checked ? { decision_negative_marked: false } : {}),
            }
          : {
              decision_negative_marked: checked,
              ...(checked ? { decision_positive_marked: false } : {}),
            };
      await updatePatentMutation.mutateAsync({ id: entityId, data: payload });
      showNotification(
        'success',
        'Готово',
        checked
          ? kind === 'positive'
            ? 'Положительное решение отмечено'
            : 'Отрицательное решение отмечено'
          : 'Отметка решения снята',
      );
      if (checked) {
        showNotification('info', 'Статус обновлен', 'Статус РИД пересчитан автоматически');
        if (kind === 'negative') {
          openCopyPromptFromRefusal();
        }
      }
    } catch (e: unknown) {
      showNotification(
        'error',
        'Ошибка',
        getApiErrorMessage(e) ?? 'Не удалось сохранить отметку решения',
      );
    } finally {
      setDecisionMarkerUpdating(null);
    }
  };

  const submitCopyFromRefusal = async () => {
    try {
      setCopyPromptSubmitting(true);
      const created = await patentApi.createCopyFromRefusal(entityId);
      const reason = copyPromptComment.trim();
      if (reason) {
        const createdBy = currentSrmUserId || undefined;
        const sourcePatent = await patentApi.getPatentById(entityId);
        const formatRidRef = (p: {
          registration_number?: string;
          registration_number_cir?: string;
          name?: string;
        }): string => {
          const number = p.registration_number?.trim() || p.registration_number_cir?.trim() || '';
          const base = number ? `№ ${number}` : 'без номера';
          const name = p.name?.trim();
          return name ? `${base} "${name}"` : base;
        };
        const sourceLabel = formatRidRef(sourcePatent);
        const createdLabel = formatRidRef(created);
        await Promise.all([
          commentApi.addComment({
            entity_type: 'patent',
            entity_id: entityId,
            message: `Создана копия РИД: из ${sourceLabel} -> ${createdLabel}. Причина: ${reason}`,
            created_by: createdBy,
            user_id: createdBy,
          }),
          commentApi.addComment({
            entity_type: 'patent',
            entity_id: created.id,
            message: `Карточка ${createdLabel} создана как копия РИД ${sourceLabel}. Причина: ${reason}`,
            created_by: createdBy,
            user_id: createdBy,
          }),
        ]);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: commentQueryKeys.byEntity('patent', entityId) }),
          queryClient.invalidateQueries({ queryKey: commentQueryKeys.byEntity('patent', created.id) }),
        ]);
      }
      await queryClient.invalidateQueries({ queryKey: patentQueryKeys.all });
      setCopyPromptOpen(false);
      showNotification('success', 'Готово', 'Создана копия карточки РИД и проставлены связи');
      if (!copyPromptStayCurrent) {
        navigate(`/patents/${created.id}/edit`);
      }
    } catch {
      showNotification('error', 'Ошибка', 'Не удалось создать копию карточки РИД');
    } finally {
      setCopyPromptSubmitting(false);
    }
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

          {isRequests ? (
            <div className={styles.requestsFileTags} onClick={e => e.stopPropagation()}>
              {file.response_required || file.response_deadline ? (
                <>
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
                </>
              ) : (
                <Text type='secondary' className={styles.requestParamsHint}>
                  Параметры запроса не заданы — укажите через{' '}
                  <EditOutlined style={{ marginInline: 2 }} />
                </Text>
              )}
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

  const renderSectionColumn = (section: EntityFileSectionDef) => {
    const isRequests = section.key === 'requests';
    const isPositiveDecision = section.key === 'decision_positive';
    const isNegativeDecision = section.key === 'decision_negative';
    const isDecisionSection = isPositiveDecision || isNegativeDecision;
    const sectionFiles = files.filter(f => sectionKeyForFile(f.document_section) === section.key);
    const sectionHasFiles = sectionFiles.length > 0;
    const decisionMarked = isPositiveDecision
      ? Boolean(patent?.decision_positive_marked)
      : isNegativeDecision
        ? Boolean(patent?.decision_negative_marked)
        : false;
    const hasNegativeDecisionSignal =
      Boolean(patent?.decision_negative_marked) ||
      files.some(f => sectionKeyForFile(f.document_section) === 'decision_negative');
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
        <div className={styles.sectionTitleRow}>
          <Title level={5} id={headingId} className={styles.sectionTitle}>
            {section.title}
          </Title>
          {entityType === 'patent' && isNegativeDecision ? (
            <Button
              size='small'
              onClick={openCopyPromptFromRefusal}
              disabled={!hasNegativeDecisionSignal || uploading || decisionMarkerUpdating !== null}
            >
              Создать копию РИД
            </Button>
          ) : null}
        </div>
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

        {entityType === 'patent' && isDecisionSection && decisionMarked ? (
          <div
            className={`${styles.requestStatusBanner} ${
              isNegativeDecision ? styles.decisionMarkedBannerNegative : styles.decisionMarkedBannerPositive
            }`}
          >
            {isNegativeDecision ? (
              <CloseCircleOutlined className={styles.requestStatusIcon} />
            ) : (
              <CheckCircleOutlined className={styles.requestStatusIcon} />
            )}
            <Text className={styles.requestStatusText}>
              {isNegativeDecision
                ? 'Отказ в выдаче отмечен без прикреплённого документа'
                : 'Положительное решение отмечено без прикреплённого документа'}
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

        {entityType === 'patent' && isDecisionSection ? (
          <div className={styles.decisionMarkerBar}>
            <Checkbox
              checked={decisionMarked}
              disabled={uploading || decisionMarkerUpdating !== null}
              onChange={e =>
                void handleDecisionMarkerChange(
                  isPositiveDecision ? 'positive' : 'negative',
                  e.target.checked,
                )
              }
            >
              {isPositiveDecision ? 'Решение получено (без документа)' : 'Отказ в выдаче (без документа)'}
            </Checkbox>
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
  };

  const getSectionFileCount = (sectionKey: string): number =>
    files.filter(f => sectionKeyForFile(f.document_section) === sectionKey).length;

  if (gridSections) {
    const communicationTabCount = patentFileSections
      ? PATENT_FILE_COMMUNICATION_SECTIONS.reduce((sum, section) => sum + getSectionFileCount(section.key), 0)
      : 0;
    const applicationTabCount = patentFileSections
      ? PATENT_FILE_APPLICATION_SECTIONS.reduce((sum, section) => sum + getSectionFileCount(section.key), 0)
      : 0;
    return (
      <div className={styles.pageWrap}>
        {contextHolder}
        <Spin spinning={isLoading || uploading}>
          <>
            {patentFileSections ? (
              <Tabs
                className={styles.patentTabs}
                activeKey={activePatentTab}
                onChange={k => setActivePatentTab(k as PatentFilesTabKey)}
                items={[
                  {
                    key: 'application',
                    label: (
                      <span className={styles.patentTabLabel}>
                        Документы заявки <Badge count={applicationTabCount} color={token.colorPrimary} />
                      </span>
                    ),
                    children: (
                      <div className={`${styles.sectionsStack} ${styles.sectionsStackPatentApplication}`}>
                        {PATENT_FILE_APPLICATION_SECTIONS.map(renderSectionColumn)}
                      </div>
                    ),
                  },
                  {
                    key: 'communication',
                    label: (
                      <span className={styles.patentTabLabel}>
                        Запросы и решение <Badge count={communicationTabCount} color={token.colorPrimary} />
                      </span>
                    ),
                    children: (
                      <div className={`${styles.sectionsStack} ${styles.sectionsStackPatentCommunication}`}>
                        {PATENT_FILE_COMMUNICATION_SECTIONS.map(renderSectionColumn)}
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <div
                className={styles.sectionsStack}
                style={
                  gridSections.length !== 3
                    ? { gridTemplateColumns: `repeat(${gridSections.length}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {gridSections.map(renderSectionColumn)}
              </div>
            )}
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
        <Modal
          title='Создать копию карточки РИД?'
          open={copyPromptOpen}
          onCancel={() => {
            if (!copyPromptSubmitting) setCopyPromptOpen(false);
          }}
          onOk={submitCopyFromRefusal}
          okText='Создать копию'
          cancelText='Позже'
          confirmLoading={copyPromptSubmitting}
          destroyOnHidden
        >
          <Text style={{ display: 'block', marginBottom: 10 }}>
            Отмечено отрицательное решение. Можно создать новую карточку-копию и связать её с текущей.
          </Text>
          <Checkbox
            checked={copyPromptStayCurrent}
            onChange={e => setCopyPromptStayCurrent(e.target.checked)}
            style={{ marginBottom: 12 }}
          >
            Остаться в текущей карточке после создания
          </Checkbox>
          <Form layout='vertical'>
            <Form.Item label='Комментарий к связи (почему создана копия)'>
              <Input.TextArea
                value={copyPromptComment}
                onChange={e => setCopyPromptComment(e.target.value)}
                placeholder='Например: отказ по формулировкам, подаем доработанную заявку'
                autoSize={{ minRows: 2, maxRows: 5 }}
                maxLength={500}
              />
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
