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
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Spin, Tag, Tooltip, type MenuProps } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { commentQueryKeys } from '@/api/comments/commentQueryKeys';
import { swRegistryApi } from '@/api/swRegistry/swRegistryApi';
import { swRegistryQueryKeys } from '@/api/swRegistry/swRegistryQueryKeys';
import {
  useArchiveSwDocument,
  useArchiveSwItem,
  useChangeSwDocumentStatus,
  useCreateSwDocument,
  useMarkSwItemDeleted,
  useRestoreSwDocument,
  useRestoreSwItem,
  useSwFiles,
  useSwItem,
  useSwItemPatentLinks,
  useSwReferences,
  useUpdateSwDocument,
  useUpdateSwItem,
} from '@/api/swRegistry/swRegistryApiHooks';
import { DocumentViewerModal } from '@/components/documentViewer/DocumentViewerModal';
import { SvnPickerModal } from '@/components/svnPicker/SvnPickerModal';
import { svnApi } from '@/components/svnPicker/svnApi';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
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
import { SwDocumentCreateModal } from './SwDocumentCreateModal';
import { SwDocumentDrawer, type SwDocumentDrawerTab } from './SwDocumentDrawer';
import { SwDocumentEditModal } from './SwDocumentEditModal';
import { SwDocumentStatusModal } from './SwDocumentStatusModal';
import { formatKindLabel, SwDocumentsTable, type SwDocumentFile } from './SwDocumentsTable';
import { SwFilesTab } from './SwFilesTab';
import { SwIpsPlacementModal } from './SwIpsPlacementModal';
import { SwItemEditModal } from './SwItemEditModal';
import { SwItemRidTab } from './SwItemRidTab';
import styles from './SwStructurePage.module.scss';

type Props = {
  item: SwItemListRow;
  kindByCode: Map<string, string>;
  documentKindByCode: Map<string, string>;
  gostCodeByKind: Map<string, string>;
  statusByCode: Map<string, string>;
  /** Программа помечена удалённой — экран снимает с неё выбор. */
  onDeleted: () => void;
  /** Переход к элементу структуры программы в дереве. */
  onSelectElement: (elementId: string) => void;
};

type StatusModalState = {
  document: SwDocumentListRow;
  scope: 'document' | 'sheet';
};

type ProgramTab = 'documents' | 'files' | 'rid';

export function SwProgramPanel({
  item,
  kindByCode,
  documentKindByCode,
  gostCodeByKind,
  statusByCode,
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
  const filesQuery = useSwFiles('sw_item', item.id);
  const ridLinksQuery = useSwItemPatentLinks(item.id);

  const docKindsQuery = useSwReferences('documentKinds');
  const requiresSheetByKind = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, Boolean(k.requiresApprovalSheet)])),
    [docKindsQuery.data],
  );

  // Вкладка — в адресе (tab=files|rid): ссылка из строки браузера открывает ту же вкладку. Без параметра —
  // комплект; ссылка из свода с фильтром статуса вкладку не несёт и потому открывает комплект.
  const tabParam = searchParams.get('tab');
  const tab: ProgramTab = tabParam === 'files' || tabParam === 'rid' ? tabParam : 'documents';
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
  const [svnTarget, setSvnTarget] = useState<{ id: string; designation: string } | null>(null);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createDocError, setCreateDocError] = useState<unknown>(null);
  const [editDoc, setEditDoc] = useState<SwDocumentListRow | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [ipsModalDoc, setIpsModalDoc] = useState<SwDocumentListRow | null>(null);

  const updateItemMut = useUpdateSwItem();
  const archiveItemMut = useArchiveSwItem();
  const restoreItemMut = useRestoreSwItem();
  const markItemDeletedMut = useMarkSwItemDeleted();
  const createDocMut = useCreateSwDocument();
  const changeStatusMut = useChangeSwDocumentStatus();
  const updateDocMut = useUpdateSwDocument();
  const archiveDocMut = useArchiveSwDocument();
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

  // Файлы комплекта: по одному запросу на документ, в обратном индексе связь
  // хранится за объектом, списком по программе хранилище её не отдаёт.
  const fileQueries = useQueries({
    queries: documents.map(doc => ({
      queryKey: swRegistryQueryKeys.files('sw_document', doc.id),
      queryFn: () => swRegistryApi.listFiles('sw_document', doc.id),
      staleTime: 60_000,
    })),
  });
  const fileByDocument = new Map<string, SwDocumentFile>();
  documents.forEach((doc, index) => {
    // Показываем актуальную копию: сперва пришедшую из SVN, иначе последнюю
    // загруженную. Первая по порядку — самая старая, и это вводило в заблуждение.
    const attached = fileQueries[index]?.data ?? [];
    const actual = [...attached].reverse().find(f => f.svnPath) ?? attached.at(-1);
    if (actual) {
      fileByDocument.set(doc.id, {
        fileId: actual.fileId,
        filename: actual.filename,
        svnPath: actual.svnPath ?? null,
        svnRevision: actual.svnRevision ?? null,
      });
    }
  });

  // Ревизии в SVN спрашиваем одним запросом на весь комплект: свежесть копии
  // видно сразу, без клика по каждому документу.
  const svnPaths = [...fileByDocument.values()].map(f => f.svnPath).filter((p): p is string => Boolean(p));
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

  const tabs: { key: ProgramTab; label: string; count: number }[] = [
    { key: 'documents', label: 'Комплект документации', count: documents.length },
    { key: 'files', label: 'Файлы', count: filesQuery.data?.length ?? 0 },
    { key: 'rid', label: 'Связанные РИД', count: ridLinksQuery.data?.length ?? detail?.patentsCount ?? 0 },
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
      title: 'Пометить программу удаленной?',
      content: 'Запись исчезнет из реестра и свода. Действие необратимо.',
      okText: 'Пометить удаленным',
      okButtonProps: { danger: true },
      onOk: () =>
        markItemDeletedMut.mutate(item.id, {
          onSuccess: () => {
            message.success('Программа помечена удаленной');
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

  const submitEditDoc = (payload: UpdateSwDocumentPayload) => {
    if (!editDoc) return;
    updateDocMut.mutate(
      { id: editDoc.id, payload },
      {
        onSuccess: data => {
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Документ обновлен');
          setEditDoc(null);
        },
        onError: fail,
      },
    );
  };

  const handleArchiveDoc = (document: SwDocumentListRow) => {
    modal.confirm({
      title: 'Перевести документ в архив?',
      content: 'Документ исчезнет из действующего комплекта, но останется в своде и архиве программы.',
      okText: 'В архив',
      okButtonProps: { danger: true },
      onOk: () =>
        archiveDocMut.mutate(document.id, {
          onSuccess: () => message.success('Документ в архиве'),
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

  const handleSetupSheet = (document: SwDocumentListRow) => {
    updateDocMut.mutate(
      { id: document.id, payload: { approvalSheet: { sheetsCount: 1 } } },
      {
        onSuccess: () => message.success('Лист утверждения оформлен'),
        onError: fail,
      },
    );
  };

  const currentStatusCode =
    statusModal?.scope === 'sheet' ? statusModal.document.sheetStatusCode : statusModal?.document.statusCode;

  // Редкие и необратимые действия с программой — в меню «⋯», как у строк комплекта: на виду только правка.
  const itemMenuItems: NonNullable<MenuProps['items']> = [
    isArchived
      ? { key: 'restore', icon: <UndoOutlined />, label: 'Вернуть из архива' }
      : { key: 'archive', icon: <InboxOutlined />, label: 'В архив' },
    { type: 'divider' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Пометить удаленным', danger: true },
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
              <Dropdown trigger={['click']} placement='bottomRight' menu={{ items: itemMenuItems, onClick: handleItemMenu }}>
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
            <dd title={item.partner.name}>
              <span className={styles.metaText}>{item.partner.name}</span>
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
                <span className={styles.filterTabCount}>{t.count}</span>
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

            {detailQuery.isLoading ? (
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
                onArchive={handleArchiveDoc}
                onRestore={handleRestoreDoc}
                onChangeStatus={(document, scope) => setStatusModal({ document, scope })}
                onOpenIps={document => setIpsModalDoc(document)}
                onSetupSheet={handleSetupSheet}
                fileByDocument={fileByDocument}
                onPreview={setPreview}
                onDownload={downloadFile}
                svnEnabled={svnEnabled}
                currentRevisions={currentRevisions}
                onPickFromSvn={doc => setSvnTarget({ id: doc.id, designation: doc.designation })}
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
              canEdit={canEditItem}
              compact
            />
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
          objectType='sw_document'
          objectId={svnTarget.id}
          startPath={folderPath ?? ''}
          onClose={() => setSvnTarget(null)}
          onDone={() => {
            void queryClient.invalidateQueries({ queryKey: ['sw'] });
            void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.files('sw_document', svnTarget.id) });
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
        isRnd={item.developmentKindCode === 'rnd'}
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

      <DocumentViewerModal
        open={preview != null}
        fileId={preview?.fileId ?? null}
        fileName={preview?.filename}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
