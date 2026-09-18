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

import { SwItemEditModal } from '../items/SwItemEditModal';
import { SwApprovalSheetModal, type ApprovalSheetSubmit } from '../program/documents/SwApprovalSheetModal';
import { SwDocumentCreateModal } from '../program/documents/SwDocumentCreateModal';
import { SwDocumentDrawer, type SwDocumentDrawerTab } from '../program/documents/SwDocumentDrawer';
import { SwDocumentEditModal, type DocumentFileReplacement } from '../program/documents/SwDocumentEditModal';
import { formatKindLabel, SwDocumentsTable, type SwDocumentFile } from '../program/documents/SwDocumentsTable';
import { SwDocumentStatusModal } from '../program/documents/SwDocumentStatusModal';
import { SwIpsPlacementModal } from '../program/documents/SwIpsPlacementModal';
import { SwFilesTab } from '../program/files/SwFilesTab';
import { SwFirmwaresTab } from '../program/firmwares/SwFirmwaresTab';
import { SwItemRidTab } from '../program/rid/SwItemRidTab';
import { developmentKindAllowsApprovalSheet } from '../shared/swDesignationPreview';
import type { SwFileChoice } from '../shared/SwFileSourcePicker';
import { usePartnerShortName } from '../shared/usePartnerShortName';
import styles from '../SwStructurePage.module.scss';
import { SwProgramHeader } from './SwProgramHeader';
import { useProgramDocumentActions } from './useProgramDocumentActions';

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

  const docs = useProgramDocumentActions(item, { openDocumentId, closeDocument });
  const updateItemMut = useUpdateSwItem();
  const archiveItemMut = useArchiveSwItem();
  const restoreItemMut = useRestoreSwItem();
  const markItemDeletedMut = useMarkSwItemDeleted();

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

  // Редкие и необратимые действия с программой — в меню «⋯», как у строк комплекта: на виду только правка.
  const itemActionPending = archiveItemMut.isPending || restoreItemMut.isPending || markItemDeletedMut.isPending;
  const developmentKindLabel = kindByCode.get(item.developmentKindCode) ?? item.developmentKindCode;

  return (
    <div className={styles.programStack}>
      <SwProgramHeader
        item={item}
        detail={detail}
        labels={{ developmentKind: developmentKindLabel, partner: partnerLabel }}
        folderPath={folderPath}
        svnEnabled={svnEnabled}
        isArchived={isArchived}
        fullNameDiffers={fullNameDiffers}
        canManageItem={canManageItem}
        canEditItem={canEditItem}
        itemActionPending={itemActionPending}
        onEdit={() => setEditOpen(true)}
        onArchive={handleArchiveItem}
        onRestore={handleRestoreItem}
        onMarkDeleted={handleMarkItemDeleted}
        onPickFolder={() => setFolderPickerOpen(true)}
        onSelectElement={onSelectElement}
      />

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
                    docs.setCreateDocError(null);
                    docs.setCreateDocOpen(true);
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
                onEdit={document => docs.setEditDoc(document)}
                onDelete={docs.handleDeleteDoc}
                onRestore={docs.handleRestoreDoc}
                onChangeStatus={(document, scope) => docs.setStatusModal({ document, scope })}
                onOpenIps={document => docs.setIpsModalDoc(document)}
                sheetAllowed={sheetAllowed}
                onSetupSheet={docs.handleSetupSheet}
                onRemoveSheet={docs.handleRemoveSheet}
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
        open={docs.createDocOpen}
        itemId={item.id}
        svnEnabled={svnEnabled}
        svnFolderPath={folderPath}
        sheetAllowed={sheetAllowed}
        programDesignation={item.designation}
        existingDocuments={documents}
        confirmLoading={docs.createPending}
        submitError={docs.createDocError}
        onCancel={() => {
          docs.setCreateDocError(null);
          docs.setCreateDocOpen(false);
        }}
        onSubmit={docs.submitCreateDoc}
      />
      <SwDocumentEditModal
        open={docs.editDoc != null}
        document={docs.editDoc}
        programDesignation={item.designation}
        file={docs.editDoc ? (fileByDocument.get(docs.editDoc.id) ?? null) : null}
        svnEnabled={svnEnabled}
        svnFolderPath={folderPath}
        confirmLoading={docs.updatePending}
        onCancel={() => docs.setEditDoc(null)}
        onSubmit={docs.submitEditDoc}
      />
      <SwDocumentStatusModal
        open={docs.statusModal != null}
        document={docs.statusModal?.document ?? null}
        scope={docs.statusModal?.scope ?? 'document'}
        currentStatusCode={docs.currentStatusCode ?? null}
        confirmLoading={docs.statusPending}
        onCancel={() => docs.setStatusModal(null)}
        onSubmit={docs.submitStatus}
      />
      <SwIpsPlacementModal
        open={docs.ipsModalDoc != null}
        document={docs.ipsModalDoc}
        confirmLoading={docs.statusPending}
        onCancel={() => docs.setIpsModalDoc(null)}
        onSubmit={docs.submitStatus}
      />
      <SwApprovalSheetModal
        open={docs.sheetModalDoc != null}
        document={docs.sheetModalDoc}
        sheetFile={docs.sheetModalDoc ? (sheetFileByDocument.get(docs.sheetModalDoc.id) ?? null) : null}
        svnEnabled={svnEnabled}
        svnFolderPath={folderPath}
        confirmLoading={docs.updatePending}
        onCancel={() => docs.setSheetModalDoc(null)}
        onSubmit={docs.submitSheet}
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
