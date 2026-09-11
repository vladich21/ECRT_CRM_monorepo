import { useMemo, useState } from 'react';
import { DeleteOutlined, EditOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useSwFiles, useArchiveSwItem, useChangeSwDocumentStatus, useCreateSwDocument, useMarkSwItemDeleted, useRestoreSwItem, useSwItem, useSwItemPatentLinks, useSwReferences, useUpdateSwDocument, useUpdateSwItem } from '@/api/swRegistry/swRegistryApiHooks';
import { SwFilesTab } from './SwFilesTab';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader from '@/components/pageLayout/DetailPageHeader';
import {
  getInternalReturnBackLabel,
} from '@/helpers/internalReturnNavigation';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import type {
  ChangeSwDocumentStatusPayload,
  CreateSwDocumentPayload,
  SwDocumentListRow,
  UpdateSwItemPayload,
} from '@/types/swRegistry';
import { SwDocumentCreateModal } from './SwDocumentCreateModal';
import { SwDocumentStatusModal } from './SwDocumentStatusModal';
import { SwDocumentsTable } from './SwDocumentsTable';
import { SwIpsPlacementModal } from './SwIpsPlacementModal';
import { SwItemEditModal } from './SwItemEditModal';
import { SwItemRidTab } from './SwItemRidTab';
import { resolveSwItemDetailBackPath, readSwRegistryReturnState } from './swRegistryNavigation';
import styles from './SwItemDetailsPage.module.scss';

type CardTab = 'main' | 'documents' | 'files' | 'rid';

type StatusModalState = {
  document: SwDocumentListRow;
  scope: 'document' | 'sheet';
};

export default function SwItemDetailsPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const documentStatusFilter = searchParams.get('documentStatus') ?? undefined;
  const sheetStatusFilter = searchParams.get('sheetStatus') ?? undefined;
  const { message, modal } = App.useApp();
  const { hasSectionPermission } = usePermissions();
  const canEdit = hasSectionPermission(SECTIONS.SW_ITEMS, 'edit');

  const from = readSwRegistryReturnState(location.state).from;
  const stateTab = readSwRegistryReturnState(location.state).tab;
  const initialTab =
    stateTab === 'main' || stateTab === 'documents' || stateTab === 'files' || stateTab === 'rid'
      ? stateTab
      : undefined;
  const hasSummaryDrill = Boolean(documentStatusFilter || sheetStatusFilter);
  const backPath = resolveSwItemDetailBackPath({
    from,
    hasSummaryDrill,
    listSearch: location.search,
  });
  const backLabel = getInternalReturnBackLabel(backPath, 'К реестру программного обеспечения');

  const itemQuery = useSwItem(itemId);
  const patentLinksQuery = useSwItemPatentLinks(itemId);
  const filesQuery = useSwFiles('sw_item', itemId);
  const kindsQuery = useSwReferences('developmentKinds');
  const docKindsQuery = useSwReferences('documentKinds');
  const statusesQuery = useSwReferences('statuses');

  const updateMut = useUpdateSwItem();
  const archiveMut = useArchiveSwItem();
  const restoreMut = useRestoreSwItem();
  const markDeletedMut = useMarkSwItemDeleted();
  const createDocMut = useCreateSwDocument();
  const changeStatusMut = useChangeSwDocumentStatus();
  const updateDocMut = useUpdateSwDocument();

  const [cardTab, setCardTab] = useState<CardTab>(
    initialTab ?? (documentStatusFilter || sheetStatusFilter ? 'documents' : 'documents'),
  );
  const [editOpen, setEditOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createDocError, setCreateDocError] = useState<unknown>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [ipsModalDoc, setIpsModalDoc] = useState<SwDocumentListRow | null>(null);

  const item = itemQuery.data;
  const kindByCode = useMemo(
    () => new Map((kindsQuery.data ?? []).map(k => [k.code, k.name])),
    [kindsQuery.data],
  );
  const docKindByCode = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, k.name])),
    [docKindsQuery.data],
  );
  const gostCodeByKind = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, k.gostCode ?? ''])),
    [docKindsQuery.data],
  );
  const requiresSheetByKind = useMemo(
    () => new Map((docKindsQuery.data ?? []).map(k => [k.code, Boolean(k.requiresApprovalSheet)])),
    [docKindsQuery.data],
  );
  const statusByCode = useMemo(
    () => new Map((statusesQuery.data ?? []).map(s => [s.code, s.name])),
    [statusesQuery.data],
  );

  const fail = (err: unknown) => message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');

  const handleBack = () => navigate(backPath);

  const submitEdit = (payload: UpdateSwItemPayload) => {
    if (!itemId) return;
    updateMut.mutate(
      { id: itemId, payload },
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

  const submitCreateDoc = (payload: CreateSwDocumentPayload) => {
    if (!itemId) return;
    createDocMut.mutate(
      { itemId, payload },
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

  const submitStatus = (payload: ChangeSwDocumentStatusPayload) => {
    const docId = statusModal?.document.id ?? ipsModalDoc?.id;
    if (!docId) return;
    changeStatusMut.mutate(
      { id: docId, payload },
      {
        onSuccess: () => {
          message.success(payload.statusCode === 'in_ips' ? 'Размещение в IPS зафиксировано' : 'Статус изменен');
          setStatusModal(null);
          setIpsModalDoc(null);
        },
        onError: fail,
      },
    );
  };

  const handleArchive = () => {
    if (!itemId || !item) return;
    modal.confirm({
      title: 'Перевести программу в архив?',
      content: 'Документы программы тоже уйдут в архив.',
      okText: 'В архив',
      okButtonProps: { danger: true },
      onOk: () =>
        archiveMut.mutate(itemId, {
          onSuccess: () => message.success('Программа в архиве'),
          onError: fail,
        }),
    });
  };

  const handleRestore = () => {
    if (!itemId) return;
    restoreMut.mutate(itemId, {
      onSuccess: () => message.success('Программа восстановлена'),
      onError: fail,
    });
  };

  const handleMarkDeleted = () => {
    if (!itemId || !item) return;
    modal.confirm({
      title: 'Пометить программу удаленной?',
      content: 'Запись исчезнет из реестра и свода. Действие необратимо.',
      okText: 'Пометить удаленным',
      okButtonProps: { danger: true },
      onOk: () =>
        markDeletedMut.mutate(itemId, {
          onSuccess: () => {
            message.success('Программа помечена удаленной');
            navigate(backPath);
          },
          onError: fail,
        }),
    });
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

  const visibleDocuments = useMemo(() => {
    const docs = item?.documents ?? [];
    if (documentStatusFilter) return docs.filter(d => d.statusCode === documentStatusFilter);
    if (sheetStatusFilter) return docs.filter(d => d.sheetStatusCode === sheetStatusFilter);
    return docs;
  }, [item?.documents, documentStatusFilter, sheetStatusFilter]);

  if (itemQuery.isLoading && !item) return <Loader />;
  if (itemQuery.isError || !item) return <NotFound errorMessage='Программа не найдена' />;

  const isRnd = item.developmentKindCode === 'rnd';
  const isArchived = item.recordState === 'archived';
  const kindLabel = kindByCode.get(item.developmentKindCode) ?? item.developmentKindCode;
  const currentStatusCode =
    statusModal?.scope === 'sheet' ? statusModal.document.sheetStatusCode : statusModal?.document.statusCode;
  const ridLinksCount = patentLinksQuery.data?.length ?? item?.patentsCount ?? 0;

  return (
    <>
      <DetailPageHeader
        title={`${item.designation} · ${item.shortName}`}
        titleWeight='medium'
        backLabel={backLabel}
        onBack={handleBack}
        statusBadge={
          isArchived
            ? { label: 'архивная', variant: 'neutral' }
            : { label: 'действующая', variant: 'success' }
        }
        metaItems={[
          <span key='kind' className={styles.headerMetaChip}>
            {kindLabel}
          </span>,
          <span key='element' className={styles.headerMetaChip}>
            {item.element.code} / {item.element.name}
          </span>,
        ]}
        actions={
          canEdit ? (
            <>
              <Button type='primary' icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                Редактировать
              </Button>
              {isArchived ? (
                <Button icon={<UndoOutlined />} className={styles.restoreBtn} onClick={handleRestore}>
                  Вернуть из архива
                </Button>
              ) : (
                <Button className={styles.archiveBtn} onClick={handleArchive}>
                  В архив
                </Button>
              )}
              <Button
                type='primary'
                danger
                icon={<DeleteOutlined />}
                loading={markDeletedMut.isPending}
                onClick={handleMarkDeleted}
              >
                Пометить удаленным
              </Button>
            </>
          ) : undefined
        }
        tabs={[
          { key: 'main', label: 'Основная информация' },
          { key: 'documents', label: `Комплект документации (${item.documents.length})` },
          { key: 'files', label: `Файлы (${filesQuery.data?.length ?? 0})` },
          { key: 'rid', label: `Связи с РИД (${ridLinksCount})` },
        ]}
        activeTab={cardTab}
        onTabChange={key => setCardTab(key as CardTab)}
      >
        {cardTab === 'main' ? (
          <div className={styles.sectionCard}>
            <h3 className={styles.cardTitle}>Основные сведения</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Обозначение</span>
                <span className={styles.infoValue}>{item.designation}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Краткое наименование</span>
                <span className={styles.infoValue}>{item.shortName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Полное наименование</span>
                <span className={styles.infoValue}>{item.fullName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Вид разработки</span>
                <span className={styles.infoValue}>{kindLabel}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Элемент структуры</span>
                <Link to={`/sw/structure?elementId=${item.element.id}`} className={styles.infoLink}>
                  {item.element.code} · {item.element.name}
                </Link>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Разработчик</span>
                <span className={styles.infoValue}>{item.partner.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ответственный</span>
                <span className={styles.infoValue}>{item.responsible.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ссылка на ТЗ</span>
                {item.specUrl ? (
                  <a href={item.specUrl} target='_blank' rel='noreferrer' className={styles.infoLink}>
                    {item.specUrl}
                  </a>
                ) : (
                  <span className={styles.infoValue}>—</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {cardTab === 'documents' ? (
          <div className={styles.sectionCard}>
            {canEdit && !isArchived ? (
              <div className={styles.cardTitleRow}>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setCreateDocError(null);
                    setCreateDocOpen(true);
                  }}
                >
                  Добавить документ
                </Button>
              </div>
            ) : null}
            {visibleDocuments.length === 0 ? (
              <div className={styles.emptyHint}>
                {documentStatusFilter || sheetStatusFilter
                  ? 'Нет документов с выбранным статусом'
                  : 'Документов пока нет'}
              </div>
            ) : (
              <SwDocumentsTable
                itemId={itemId!}
                documents={visibleDocuments}
                kindLabelByCode={docKindByCode}
                gostCodeByKind={gostCodeByKind}
                statusLabelByCode={statusByCode}
                requiresApprovalSheetByKind={requiresSheetByKind}
                canEdit={canEdit && !isArchived}
                onChangeStatus={(document, scope) => setStatusModal({ document, scope })}
                onOpenIps={document => setIpsModalDoc(document)}
                onSetupSheet={handleSetupSheet}
              />
            )}
          </div>
        ) : null}

        {cardTab === 'files' && itemId ? (
          <div className={styles.sectionCard}>
            <SwFilesTab
              objectType='sw_item'
              objectId={itemId}
              purpose='spec'
              title='Техническое задание и спецификации'
              hint='Файлы спецификации программы (purpose: spec)'
              canEdit={canEdit && !isArchived}
            />
          </div>
        ) : null}

        {cardTab === 'rid' && itemId ? (
          <div className={styles.sectionCard}>
            <SwItemRidTab itemId={itemId} canEdit={canEdit && !isArchived} />
          </div>
        ) : null}
      </DetailPageHeader>

      <SwItemEditModal
        open={editOpen}
        item={item}
        confirmLoading={updateMut.isPending}
        onCancel={() => setEditOpen(false)}
        onSubmit={submitEdit}
      />
      <SwDocumentCreateModal
        open={createDocOpen}
        isRnd={isRnd}
        programDesignation={item.designation}
        existingDocuments={item.documents}
        confirmLoading={createDocMut.isPending}
        submitError={createDocError}
        onCancel={() => {
          setCreateDocError(null);
          setCreateDocOpen(false);
        }}
        onSubmit={submitCreateDoc}
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
    </>
  );
}
