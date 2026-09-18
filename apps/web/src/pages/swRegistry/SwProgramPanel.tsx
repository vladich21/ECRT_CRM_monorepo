import { useMemo, useState } from 'react';
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  MoreOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Spin, Tag, Tooltip, type MenuProps } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { commentQueryKeys } from '@/api/comments/commentQueryKeys';
import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import {
  useArchiveSwItem,
  useChangeSwDocumentStatus,
  useCreateSwDocument,
  useMarkSwDocumentDeleted,
  useMarkSwItemDeleted,
  useRestoreSwDocument,
  useRestoreSwItem,
  useSwFiles,
  useSwFirmwares,
  useSwItem,
  useSwItemPatentLinks,
  useSwReferences,
  useUpdateSwDocument,
  useUpdateSwItem,
} from '@/api/swRegistry/swRegistryApiHooks';
import { swRegistryQueryKeys } from '@/api/swRegistry/swRegistryQueryKeys';
import { uploadSwRegistryFile } from '@/api/swRegistry/uploadSwFile';
import { DocumentViewerModal } from '@/components/documentViewer/DocumentViewerModal';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import { svnApi } from '@/components/svnPicker/svnApi';
import { SvnPickerModal } from '@/components/svnPicker/SvnPickerModal';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import type {
  ChangeSwDocumentStatusPayload,
  CreateSwDocumentPayload,
  SwDocumentListRow,
  SwItemListRow,
  UpdateSwDocumentPayload,
  UpdateSwItemPayload,
} from '@/types/swRegistry';

import { SwApprovalSheetModal, type ApprovalSheetSubmit } from './SwApprovalSheetModal';
import { developmentKindAllowsApprovalSheet } from './swDesignationPreview';
import { SwDocumentCreateModal } from './SwDocumentCreateModal';
import { SwDocumentDrawer, type SwDocumentDrawerTab } from './SwDocumentDrawer';
import { SwDocumentEditModal, type DocumentFileReplacement } from './SwDocumentEditModal';
import { formatKindLabel, SwDocumentsTable, type SwDocumentFile } from './SwDocumentsTable';
import { SwDocumentStatusModal } from './SwDocumentStatusModal';
import type { SwFileChoice } from './SwFileSourcePicker';
import { SwFilesTab } from './SwFilesTab';
import { SwFirmwaresTab } from './SwFirmwaresTab';
import { SwIpsPlacementModal } from './SwIpsPlacementModal';
import { SwItemEditModal } from './SwItemEditModal';
import { SwItemRidTab } from './SwItemRidTab';
import styles from './SwStructurePage.module.scss';
import { usePartnerShortName } from './usePartnerShortName';

type Props = {
  item: SwItemListRow;
  kindByCode: Map<string, string>;
  documentKindByCode: Map<string, string>;
  gostCodeByKind: Map<string, string>;
  statusByCode: Map<string, string>;
  /** Справочник статусов ещё едет: без него подписи и правила листа меняются на глазах. */
  referencesLoading?: boolean;
  /** Программа помечена удалённой — экран снимает с неё выбор. */
  onDeleted: () => void;
  /** Переход к элементу структуры программы в дереве. */
  onSelectElement: (elementId: string) => void;
};

type StatusModalState = {
  document: SwDocumentListRow;
  scope: 'document' | 'sheet';
};

type ProgramTab = 'documents' | 'files' | 'firmware' | 'rid';

export function SwProgramPanel({
  item,
  kindByCode,
  documentKindByCode,
  gostCodeByKind,
  statusByCode,
  referencesLoading,
  onDeleted,
  onSelectElement,
}: Props) {
  const { message, modal } = App.useApp();
  const { hasSectionPermission } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  // Фильтр приходит из свода: «документы программы в таком-то статусе».
  const documentStatusFilter = searchParams.get('documentStatus');
  const sheetStatusFilter = searchParams.get('sheetStatus');
  const statusFilter = sheetStatusFilter ?? documentStatusFilter;

  const detailQuery = useSwItem(item.id);
  const detail = detailQuery.data;
  const documents = detail?.documents ?? [];
  const sheetsTotal = documents.reduce((sum, doc) => sum + (doc.sheetsCount ?? 0), 0);
  const isArchived = item.recordState === 'archived';
  // Реквизиты, архив и удаление программы — право на программы (как было в карточке).
  const canManageItem = hasSectionPermission(SECTIONS.SW_ITEMS, 'edit');
  // Комплект, файлы и связи с РИД в архивной программе не меняем.
  const canEditItem = canManageItem && !isArchived;

  // Счётчики вкладок — из тех же запросов, что грузят сами вкладки: кэш общий, лишних обращений нет.
  const firmwaresQuery = useSwFirmwares(item.id);
  const ridLinksQuery = useSwItemPatentLinks(item.id);
  const itemFilesQuery = useSwFiles('sw_item', item.id);

  const partnerLabel = usePartnerShortName(item.partner.id, item.partner.shortName || item.partner.name);
  const docKindsQuery = useSwReferences('documentKinds');
  const applicabilityQuery = useSwReferences('statusApplicability');
  const requiresSheetByKind = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, Boolean(k.requiresApprovalSheet)])),
    [docKindsQuery.data],
  );
  const sheetAllowed = useMemo(
    () => developmentKindAllowsApprovalSheet(item.developmentKindCode, applicabilityQuery.data ?? []),
    [applicabilityQuery.data, item.developmentKindCode],
  );

  // Вкладка — в адресе (tab=firmware|rid|files): ссылка из строки браузера открывает ту же вкладку. Без параметра —
  // комплект; ссылка из свода с фильтром статуса вкладку не несёт и потому открывает комплект.
  const tabParam = searchParams.get('tab');
  const tab: ProgramTab =
    tabParam === 'firmware' || tabParam === 'rid' || tabParam === 'files' ? tabParam : 'documents';
  const setTab = (next: ProgramTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'documents') params.delete('tab');
    else params.set('tab', next);
    // Открытый документ относится к комплекту: на другой вкладке панели его нет.
    params.delete('documentId');
    params.delete('docTab');
    setSearchParams(params, { replace: true });
  };

  // Документ в боковой панели — тоже в адресе (documentId, docTab=comments): ссылка открывает ровно его.
  const openDocumentId = searchParams.get('documentId');
  const docTab: SwDocumentDrawerTab = searchParams.get('docTab') === 'comments' ? 'comments' : 'files';
  const drawerDocument = openDocumentId ? (documents.find(d => d.id === openDocumentId) ?? null) : null;
  const openDocument = (document: SwDocumentListRow) => {
    const params = new URLSearchParams(searchParams);
    params.set('documentId', document.id);
    params.delete('docTab');
    setSearchParams(params, { replace: true });
  };
  const closeDocument = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('documentId');
    params.delete('docTab');
    setSearchParams(params, { replace: true });
  };
  const setDocTab = (next: SwDocumentDrawerTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'files') params.delete('docTab');
    else params.set('docTab', next);
    setSearchParams(params, { replace: true });
  };

  const [preview, setPreview] = useState<SwDocumentFile | null>(null);
  const [svnTarget, setSvnTarget] = useState<{
    id: string;
    designation: string;
    objectType: 'sw_document' | 'sw_sheet';
    /** Путь текущей копии: при обновлении проводник открывается на ней. */
    currentPath?: string | null;
    /** Любая текущая копия (локальная или SVN) — SVN должен заменить её, а не добавить вторую. */
    replace?: boolean;
  } | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createDocError, setCreateDocError] = useState<unknown>(null);
  const [editDoc, setEditDoc] = useState<SwDocumentListRow | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [ipsModalDoc, setIpsModalDoc] = useState<SwDocumentListRow | null>(null);
  const [sheetModalDoc, setSheetModalDoc] = useState<SwDocumentListRow | null>(null);

  const updateItemMut = useUpdateSwItem();
  const archiveItemMut = useArchiveSwItem();
  const restoreItemMut = useRestoreSwItem();
  const markItemDeletedMut = useMarkSwItemDeleted();
  const createDocMut = useCreateSwDocument();
  const changeStatusMut = useChangeSwDocumentStatus();
  const updateDocMut = useUpdateSwDocument();
  const deleteDocMut = useMarkSwDocumentDeleted();
  const restoreDocMut = useRestoreSwDocument();

  const svnStatus = useQuery({
    queryKey: ['svn', 'status'],
    queryFn: () => svnApi.status(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const svnEnabled = svnStatus.data?.enabled ?? false;

  const queryClient = useQueryClient();

  const downloadFile = async (file: SwDocumentFile) => {
    const link = await swRegistryApi.getSwFileLink(file.fileId);
    triggerFileDownload(link.url, file.filename);
  };

  // Копии документов и листов приходят вместе с комплектом: раньше на каждый
  // объект уходил отдельный запрос, и таблица достраивалась по частям.
  const fileByDocument = new Map<string, SwDocumentFile>();
  const sheetFileByDocument = new Map<string, SwDocumentFile>();
  documents.forEach(doc => {
    if (doc.file) fileByDocument.set(doc.id, doc.file);
    if (doc.sheetFile) sheetFileByDocument.set(doc.id, doc.sheetFile);
  });

  /**
   * Пока не пришло всё, от чего зависит содержимое строк, показываем загрузку:
   * иначе таблица достраивается на глазах — сначала статусы кодами, потом файлы,
   * потом иконки. Ревизии SVN сюда не входят: это внешняя система, ждать её
   * ради метки «в SVN новее» значит держать пустой экран из-за чужой задержки.
   */
  const contentLoading =
    detailQuery.isLoading ||
    docKindsQuery.isLoading ||
    applicabilityQuery.isLoading ||
    Boolean(referencesLoading) ||
    firmwaresQuery.isLoading ||
    ridLinksQuery.isLoading;

  // Ревизии в SVN спрашиваем одним запросом на весь комплект: свежесть копии
  // видно сразу, без клика по каждому документу.
  const svnPaths = [...fileByDocument.values(), ...sheetFileByDocument.values()]
    .map(f => f.svnPath)
    .filter((p): p is string => Boolean(p));
  const revisionsQuery = useQuery({
    queryKey: ['svn', 'revisions', svnPaths.slice().sort().join('|')],
    queryFn: () => svnApi.revisions(svnPaths),
    enabled: svnEnabled && svnPaths.length > 0,
    staleTime: 60_000,
    retry: false,
  });
  const currentRevisions = revisionsQuery.data ?? {};

  // Каталог программы в SVN хранится в самой записи: читать его содержимое ради пути не нужно.
  const folderPath = item.svnPath ?? null;

  const fullNameDiffers = item.fullName.trim() !== item.shortName.trim();

  const visibleDocuments = documentStatusFilter
    ? documents.filter(d => d.statusCode === documentStatusFilter)
    : sheetStatusFilter
      ? documents.filter(d => d.sheetStatusCode === sheetStatusFilter)
      : documents;

  // Счётчик показываем, когда данные самой вкладки пришли: ноль вместо будущего числа
  // читается как «ничего нет», а размер плашки фиксирован — строка вкладок не дёргается.
  const tabs: { key: ProgramTab; label: string; count: number | null }[] = [
    { key: 'documents', label: 'Комплект документации', count: detail ? documents.length : null },
    { key: 'files', label: 'Файлы', count: itemFilesQuery.data?.length ?? null },
    { key: 'firmware', label: 'Прошивки', count: firmwaresQuery.data?.length ?? null },
    {
      key: 'rid',
      label: 'Связанные РИД',
      count: ridLinksQuery.data?.length ?? detail?.patentsCount ?? null,
    },
  ];

  const clearStatusFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('documentStatus');
    next.delete('sheetStatus');
    setSearchParams(next, { replace: true });
  };

  const fail = (err: unknown) => message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');

  const submitEditItem = (payload: UpdateSwItemPayload) => {
    updateItemMut.mutate(
      { id: item.id, payload },
      {
        onSuccess: data => {
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Программа обновлена');
          setEditOpen(false);
        },
        onError: fail,
      },
    );
  };

  const handleArchiveItem = () => {
    modal.confirm({
      title: 'Перевести программу в архив?',
      content: 'Документы программы тоже уйдут в архив.',
      okText: 'В архив',
      okButtonProps: { danger: true },
      onOk: () =>
        archiveItemMut.mutate(item.id, {
          onSuccess: () => message.success('Программа в архиве'),
          onError: fail,
        }),
    });
  };

  const handleRestoreItem = () => {
    restoreItemMut.mutate(item.id, {
      onSuccess: () => message.success('Программа восстановлена'),
      onError: fail,
    });
  };

  const handleMarkItemDeleted = () => {
    modal.confirm({
      title: 'Удалить программу?',
      content: 'Запись исчезнет из реестра и свода. Действие необратимо.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      onOk: () =>
        markItemDeletedMut.mutate(item.id, {
          onSuccess: () => {
            message.success('Программа удалена');
            onDeleted();
          },
          onError: fail,
        }),
    });
  };

  const submitCreateDoc = (payload: CreateSwDocumentPayload) => {
    createDocMut.mutate(
      { itemId: item.id, payload },
      {
        onSuccess: data => {
          setCreateDocError(null);
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Документ добавлен');
          setCreateDocOpen(false);
        },
        onError: err => {
          setCreateDocError(err);
          message.error(getApiErrorMessage(err) ?? 'Не удалось добавить документ');
        },
      },
    );
  };

  /**
   * Копию прикрепляем после сохранения реквизитов: сама запись не должна зависеть
   * от доступности SVN или хранилища, а объекта листа до сохранения ещё нет.
   * Всегда замена, а не добавление: у документа и листа копия одна.
   */
  const attachChoice = async (
    choice: SwFileChoice | undefined,
    target: { objectType: 'sw_document' | 'sw_sheet'; objectId: string; purpose: 'document' | 'sheet' },
    texts: {
      svnOk: (revision?: number) => string;
      uploadOk: (filename: string) => string;
      /** Сбой прикрепления саму запись не отменяет — говорим об этом прямо. */
      failed: (source: 'svn' | 'upload') => string;
    },
  ): Promise<boolean> => {
    if (!choice?.svnPath && !choice?.localFile) return false;
    try {
      if (choice.svnPath) {
        const attached = await svnApi.attach({
          objectType: target.objectType,
          objectId: target.objectId,
          path: choice.svnPath,
          replace: true,
        });
        message.success(texts.svnOk(attached.revision));
      } else if (choice.localFile) {
        await uploadSwRegistryFile(choice.localFile, {
          objectType: target.objectType,
          objectId: target.objectId,
          purpose: target.purpose,
          replace: true,
        });
        message.success(texts.uploadOk(choice.localFile.name));
      }
    } catch (err) {
      message.warning(texts.failed(choice.svnPath ? 'svn' : 'upload'));
      fail(err);
    }
    return true;
  };

  const submitEditDoc = (payload: UpdateSwDocumentPayload, replacement?: DocumentFileReplacement) => {
    if (!editDoc) return;
    const doc = editDoc;
    updateDocMut.mutate(
      { id: doc.id, payload },
      {
        onSuccess: async data => {
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Документ обновлен');

          await attachChoice(
            replacement,
            { objectType: 'sw_document', objectId: doc.id, purpose: 'document' },
            {
              svnOk: revision => `Файл обновлён из SVN (ревизия ${revision})`,
              uploadOk: filename => `Файл «${filename}» загружен`,
              failed: source =>
                source === 'svn'
                  ? 'Документ сохранён, но файл из SVN прикрепить не удалось'
                  : 'Документ сохранён, но файл загрузить не удалось',
            },
          );
          void queryClient.invalidateQueries({ queryKey: ['sw'] });
          setEditDoc(null);
        },
        onError: fail,
      },
    );
  };

  const handleDeleteDoc = (document: SwDocumentListRow) => {
    modal.confirm({
      title: `Удалить документ «${document.designation}»?`,
      content: 'Документ исчезнет из комплекта и свода. Обозначение можно будет завести заново.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      onOk: () =>
        deleteDocMut.mutate(document.id, {
          onSuccess: () => {
            message.success('Документ удалён');
            if (openDocumentId === document.id) closeDocument();
          },
          onError: fail,
        }),
    });
  };

  const handleRestoreDoc = (document: SwDocumentListRow) => {
    restoreDocMut.mutate(document.id, {
      onSuccess: () => message.success('Документ восстановлен'),
      onError: fail,
    });
  };

  const submitStatus = (payload: ChangeSwDocumentStatusPayload) => {
    const docId = statusModal?.document.id ?? ipsModalDoc?.id;
    if (!docId) return;
    changeStatusMut.mutate(
      { id: docId, payload },
      {
        onSuccess: () => {
          message.success(payload.statusCode === 'in_ips' ? 'Размещение в IPS зафиксировано' : 'Статус изменен');
          // Основание смены статуса пишется комментарием — в панели документа оно должно появиться сразу.
          void queryClient.invalidateQueries({ queryKey: commentQueryKeys.byEntity('sw_document', docId) });
          setStatusModal(null);
          setIpsModalDoc(null);
        },
        onError: fail,
      },
    );
  };

  // Реквизиты листа вводит пользователь: молча оформлять «1 лист» с обозначением
  // по умолчанию — значит заставлять потом всё исправлять.
  const handleSetupSheet = (document: SwDocumentListRow) => setSheetModalDoc(document);

  const submitSheet = (payload: ApprovalSheetSubmit) => {
    if (!sheetModalDoc) return;
    const doc = sheetModalDoc;
    const wasOformlen = Boolean(doc.sheetStatusCode);
    const { svnPath, localFile, ...sheet } = payload;
    updateDocMut.mutate(
      { id: doc.id, payload: { approvalSheet: sheet } },
      {
        onSuccess: async () => {
          const withFile = await attachChoice(
            { svnPath, localFile },
            { objectType: 'sw_sheet', objectId: doc.id, purpose: 'sheet' },
            {
              svnOk: revision => `Лист утверждения оформлен, файл из SVN (ревизия ${revision})`,
              uploadOk: filename => `Лист утверждения оформлен, файл «${filename}» загружен`,
              failed: source =>
                source === 'svn'
                  ? 'Лист сохранён, но файл из SVN прикрепить не удалось'
                  : 'Лист сохранён, но файл загрузить не удалось',
            },
          );
          if (!withFile) {
            message.success(wasOformlen ? 'Лист утверждения изменён' : 'Лист утверждения оформлен');
          }
          void queryClient.invalidateQueries({ queryKey: ['sw'] });
          setSheetModalDoc(null);
        },
        onError: fail,
      },
    );
  };

  const handleRemoveSheet = (document: SwDocumentListRow) => {
    modal.confirm({
      title: 'Удалить лист утверждения?',
      content: `Лист ${document.sheetDesignation ?? ''} будет снят с документа ${document.designation}. Сам документ останется.`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          updateDocMut.mutate(
            { id: document.id, payload: { approvalSheet: null } },
            {
              onSuccess: () => {
                message.success('Лист утверждения удалён');
                resolve();
              },
              onError: err => {
                fail(err);
                reject(err);
              },
            },
          );
        }),
    });
  };

  const currentStatusCode =
    statusModal?.scope === 'sheet' ? statusModal.document.sheetStatusCode : statusModal?.document.statusCode;

  // Редкие и необратимые действия с программой — в меню «⋯», как у строк комплекта: на виду только правка.
  const itemMenuItems: NonNullable<MenuProps['items']> = [
    isArchived
      ? { key: 'restore', icon: <UndoOutlined />, label: 'Вернуть из архива' }
      : { key: 'archive', icon: <InboxOutlined />, label: 'В архив' },
    { type: 'divider' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить', danger: true },
  ];
  const handleItemMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'archive') handleArchiveItem();
    else if (key === 'restore') handleRestoreItem();
    else if (key === 'delete') handleMarkItemDeleted();
  };
  const itemActionPending = archiveItemMut.isPending || restoreItemMut.isPending || markItemDeletedMut.isPending;
  const developmentKindLabel = kindByCode.get(item.developmentKindCode) ?? item.developmentKindCode;

  return (
    <div className={styles.programStack}>
      <header className={styles.programHeadCard}>
        <div className={styles.programHeadRow}>
          <div className={styles.programHeadTitle}>
            <div className={styles.programEyebrow}>
              <span className={styles.programDesignation}>{item.designation}</span>
              <span aria-hidden>·</span>
              <span>{developmentKindLabel}</span>
              {isArchived ? (
                <Tag bordered={false} className={styles.programState}>
                  архивная
                </Tag>
              ) : null}
            </div>
            <h2 className={styles.programHeadName}>{item.shortName}</h2>
            {fullNameDiffers ? <div className={styles.programFullName}>{item.fullName}</div> : null}
          </div>
          {canManageItem ? (
            <div className={styles.programHeadActions}>
              {/* Архивная программа только для чтения: правка возвращается вместе с программой из архива. */}
              {canEditItem ? (
                <Button size='small' icon={<EditOutlined />} disabled={!detail} onClick={() => setEditOpen(true)}>
                  Редактировать
                </Button>
              ) : null}
              <Dropdown
                trigger={['click']}
                placement='bottomRight'
                menu={{ items: itemMenuItems, onClick: handleItemMenu }}
              >
                <Button
                  size='small'
                  icon={<MoreOutlined />}
                  loading={itemActionPending}
                  aria-label='Другие действия с программой'
                />
              </Dropdown>
            </div>
          ) : null}
        </div>

        <dl className={styles.programMeta}>
          <div className={styles.metaCell}>
            <dt>Элемент структуры</dt>
            <dd title={`${item.element.code} — ${item.element.name}`}>
              <button type='button' className={styles.metaLink} onClick={() => onSelectElement(item.element.id)}>
                {item.element.name}
              </button>
            </dd>
          </div>
          <div className={styles.metaCell}>
            <dt>Ответственный</dt>
            <dd>
              <span className={styles.metaText}>{item.responsible.name}</span>
            </dd>
          </div>
          <div className={styles.metaCellWide}>
            <dt>Разработчик</dt>
            <dd title={partnerLabel}>
              <span className={styles.metaText}>{partnerLabel}</span>
            </dd>
          </div>
          {item.specUrl ? (
            <div className={styles.metaCellWide}>
              <dt>Техническое задание</dt>
              <dd title={item.specUrl}>
                <a href={item.specUrl} target='_blank' rel='noreferrer' className={styles.metaLink}>
                  {item.specUrl}
                </a>
              </dd>
            </div>
          ) : null}
          {svnEnabled ? (
            <div className={styles.metaCellWide}>
              <dt>Каталог в SVN</dt>
              <dd>
                {folderPath ? (
                  <span className={styles.metaText} title={folderPath}>
                    {folderPath}
                  </span>
                ) : (
                  <span className={styles.metaEmpty}>не привязан</span>
                )}
                {canEditItem ? (
                  folderPath ? (
                    <Tooltip title='Изменить каталог'>
                      <Button
                        type='text'
                        size='small'
                        className={styles.metaAction}
                        icon={<EditOutlined />}
                        aria-label='Изменить каталог в SVN'
                        onClick={() => setFolderPickerOpen(true)}
                      />
                    </Tooltip>
                  ) : (
                    <Button type='link' size='small' onClick={() => setFolderPickerOpen(true)}>
                      Привязать
                    </Button>
                  )
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className={`${styles.card} ${styles.programDocsCard}`}>
        <div className={styles.cardTitleRow}>
          <div className={styles.programTabs} role='tablist'>
            {tabs.map(t => (
              <button
                key={t.key}
                type='button'
                role='tab'
                aria-selected={tab === t.key}
                className={tab === t.key ? styles.programTabActive : styles.programTab}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className={styles.filterTabCount}>{t.count ?? ''}</span>
              </button>
            ))}
          </div>
          {tab === 'documents' ? (
            <span className={styles.docsTitleActions}>
              {sheetsTotal > 0 ? <span className={styles.branchDocs}>{sheetsTotal} л.</span> : null}
              {canEditItem ? (
                <Button
                  type='primary'
                  size='small'
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setCreateDocError(null);
                    setCreateDocOpen(true);
                  }}
                >
                  Добавить документ
                </Button>
              ) : null}
            </span>
          ) : null}
        </div>

        {tab === 'documents' ? (
          <>
            {statusFilter ? (
              <div className={styles.docsFilter}>
                {sheetStatusFilter ? 'Лист утверждения' : 'Статус'}:{' '}
                <strong>{statusByCode.get(statusFilter) ?? statusFilter}</strong>
                <Button type='link' size='small' icon={<CloseOutlined />} onClick={clearStatusFilter}>
                  сбросить
                </Button>
              </div>
            ) : null}

            {contentLoading ? (
              <div className={styles.branchLoading}>
                <Spin />
              </div>
            ) : visibleDocuments.length === 0 ? (
              <div className={styles.branchEmpty}>
                {statusFilter ? 'Нет документов с выбранным статусом' : 'Комплект документации пуст'}
              </div>
            ) : (
              <SwDocumentsTable
                documents={visibleDocuments}
                statusLabelByCode={statusByCode}
                requiresApprovalSheetByKind={requiresSheetByKind}
                canEdit={canEditItem}
                selectedDocumentId={drawerDocument?.id ?? null}
                onOpenDocument={openDocument}
                onEdit={document => setEditDoc(document)}
                onDelete={handleDeleteDoc}
                onRestore={handleRestoreDoc}
                onChangeStatus={(document, scope) => setStatusModal({ document, scope })}
                onOpenIps={document => setIpsModalDoc(document)}
                sheetAllowed={sheetAllowed}
                onSetupSheet={handleSetupSheet}
                onRemoveSheet={handleRemoveSheet}
                fileByDocument={fileByDocument}
                sheetFileByDocument={sheetFileByDocument}
                onPickSheetFromSvn={doc =>
                  setSvnTarget({
                    id: doc.id,
                    designation: doc.sheetDesignation ?? doc.designation,
                    objectType: 'sw_sheet',
                    currentPath: sheetFileByDocument.get(doc.id)?.svnPath ?? null,
                    replace: Boolean(sheetFileByDocument.get(doc.id)),
                  })
                }
                onPreview={setPreview}
                onDownload={downloadFile}
                svnEnabled={svnEnabled}
                currentRevisions={currentRevisions}
                onPickFromSvn={doc =>
                  setSvnTarget({
                    id: doc.id,
                    designation: doc.designation,
                    objectType: 'sw_document',
                    currentPath: fileByDocument.get(doc.id)?.svnPath ?? null,
                    replace: Boolean(fileByDocument.get(doc.id)),
                  })
                }
              />
            )}
          </>
        ) : null}

        {tab === 'files' ? (
          <div className={styles.programTabBody}>
            <SwFilesTab
              objectType='sw_item'
              objectId={item.id}
              purpose='spec'
              title='Техническое задание и спецификации'
              hint='Файлы программы, не входящие в комплект документации'
              canEdit={canEditItem}
              compact
            />
          </div>
        ) : null}

        {tab === 'firmware' ? (
          <div className={styles.programTabBody}>
            <SwFirmwaresTab itemId={item.id} canEdit={canEditItem} />
          </div>
        ) : null}

        {tab === 'rid' ? (
          <div className={styles.programTabBody}>
            <SwItemRidTab itemId={item.id} canEdit={canEditItem} />
          </div>
        ) : null}
      </div>

      {folderPickerOpen ? (
        <SvnPickerModal
          open
          mode='folder'
          itemId={item.id}
          startPath={folderPath ?? ''}
          onClose={() => setFolderPickerOpen(false)}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ['sw'] });
          }}
        />
      ) : null}

      {svnTarget ? (
        <SvnPickerModal
          open
          objectType={svnTarget.objectType}
          objectId={svnTarget.id}
          startPath={folderPath ?? ''}
          currentPath={svnTarget.currentPath ?? null}
          replace={svnTarget.replace}
          onClose={() => setSvnTarget(null)}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ['sw'] });
            void queryClient.invalidateQueries({
              queryKey: swRegistryQueryKeys.files(svnTarget.objectType, svnTarget.id),
            });
          }}
        />
      ) : null}

      <SwDocumentDrawer
        document={drawerDocument}
        kindLabel={
          drawerDocument
            ? formatKindLabel(drawerDocument.documentKindCode, documentKindByCode, gostCodeByKind)
            : undefined
        }
        statusLabel={drawerDocument ? statusByCode.get(drawerDocument.statusCode) : undefined}
        tab={docTab}
        onTabChange={setDocTab}
        canEdit={canEditItem}
        onClose={closeDocument}
      />

      <SwItemEditModal
        open={editOpen}
        item={detail ?? null}
        confirmLoading={updateItemMut.isPending}
        onCancel={() => setEditOpen(false)}
        onSubmit={submitEditItem}
      />
      <SwDocumentCreateModal
        open={createDocOpen}
        itemId={item.id}
        svnEnabled={svnEnabled}
        svnFolderPath={folderPath}
        sheetAllowed={sheetAllowed}
        programDesignation={item.designation}
        existingDocuments={documents}
        confirmLoading={createDocMut.isPending}
        submitError={createDocError}
        onCancel={() => {
          setCreateDocError(null);
          setCreateDocOpen(false);
        }}
        onSubmit={submitCreateDoc}
      />
      <SwDocumentEditModal
        open={editDoc != null}
        document={editDoc}
        programDesignation={item.designation}
        file={editDoc ? (fileByDocument.get(editDoc.id) ?? null) : null}
        svnEnabled={svnEnabled}
        svnFolderPath={folderPath}
        confirmLoading={updateDocMut.isPending}
        onCancel={() => setEditDoc(null)}
        onSubmit={submitEditDoc}
      />
      <SwDocumentStatusModal
        open={statusModal != null}
        document={statusModal?.document ?? null}
        scope={statusModal?.scope ?? 'document'}
        currentStatusCode={currentStatusCode ?? null}
        confirmLoading={changeStatusMut.isPending}
        onCancel={() => setStatusModal(null)}
        onSubmit={submitStatus}
      />
      <SwIpsPlacementModal
        open={ipsModalDoc != null}
        document={ipsModalDoc}
        confirmLoading={changeStatusMut.isPending}
        onCancel={() => setIpsModalDoc(null)}
        onSubmit={submitStatus}
      />
      <SwApprovalSheetModal
        open={sheetModalDoc != null}
        document={sheetModalDoc}
        sheetFile={sheetModalDoc ? (sheetFileByDocument.get(sheetModalDoc.id) ?? null) : null}
        svnEnabled={svnEnabled}
        svnFolderPath={folderPath}
        confirmLoading={updateDocMut.isPending}
        onCancel={() => setSheetModalDoc(null)}
        onSubmit={submitSheet}
      />

      <DocumentViewerModal
        open={preview != null}
        fileId={preview?.fileId ?? null}
        fileName={preview?.filename}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
