import { useMemo, useState } from 'react';
import { EditOutlined, UndoOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { commentQueryKeys } from '@/api/comments/commentQueryKeys';
import {
  useArchiveSwDocument,
  useChangeSwDocumentStatus,
  useRestoreSwDocument,
  useSwDocument,
  useSwFiles,
  useSwItem,
  useSwReferences,
  useUpdateSwDocument,
} from '@/api/swRegistry/swRegistryApiHooks';
import { CommentsList } from '@/components/comments/CommentsList';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader from '@/components/pageLayout/DetailPageHeader';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import type { ChangeSwDocumentStatusPayload, UpdateSwDocumentPayload } from '@/types/swRegistry';
import { SwDocumentEditModal } from './SwDocumentEditModal';
import { SwDocumentFilesTab } from './SwFilesTab';
import { formatIpsDisplay } from './swDesignationPreview';
import { SwDocumentStatusModal } from './SwDocumentStatusModal';
import { SwIpsPlacementModal } from './SwIpsPlacementModal';
import { formatSwStatusLabel, swStatusBadgeClass } from './swStatusBadge';
import { readSwRegistryReturnState } from './swRegistryNavigation';
import styles from './SwItemDetailsPage.module.scss';

type DocTab = 'main' | 'files';

export default function SwDocumentDetailsPage() {
  const { itemId, documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const registryFrom = readSwRegistryReturnState(location.state).from;
  const { message, modal } = App.useApp();
  const { hasSectionPermission } = usePermissions();
  const canEdit = hasSectionPermission(SECTIONS.SW_ITEMS, 'edit');

  const docQuery = useSwDocument(documentId);
  const itemQuery = useSwItem(itemId);
  const docFilesQuery = useSwFiles('sw_document', documentId);
  const sheetFilesQuery = useSwFiles('sw_sheet', documentId, Boolean(docQuery.data?.approvalSheet));
  const kindsQuery = useSwReferences('documentKinds');
  const statusesQuery = useSwReferences('statuses');
  const changeStatusMut = useChangeSwDocumentStatus();
  const updateDocMut = useUpdateSwDocument();
  const archiveDocMut = useArchiveSwDocument();
  const restoreDocMut = useRestoreSwDocument();

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusScope, setStatusScope] = useState<'document' | 'sheet'>('document');
  const [ipsOpen, setIpsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cardTab, setCardTab] = useState<DocTab>('main');

  const document = docQuery.data;
  const item = itemQuery.data;

  const kindLabel = useMemo(() => {
    const kind = (kindsQuery.data ?? []).find(k => k.code === document?.documentKindCode);
    if (!kind) return document?.documentKindCode ?? '';
    return kind.gostCode ? `${kind.gostCode} · ${kind.name}` : kind.name;
  }, [kindsQuery.data, document?.documentKindCode]);

  const statusByCode = useMemo(
    () => new Map((statusesQuery.data ?? []).map(s => [s.code, s.name])),
    [statusesQuery.data],
  );

  const fail = (err: unknown) => message.error(getApiErrorMessage(err) ?? 'Не удалось выполнить действие');

  const invalidateComments = () => {
    if (!documentId) return;
    void queryClient.invalidateQueries({
      queryKey: commentQueryKeys.byEntity('sw_document', documentId),
    });
  };

  const backPath = itemId ? `/sw/items/${itemId}` : '/sw/items';
  const handleBack = () => navigate(backPath, { state: { tab: 'documents', from: registryFrom } });

  const submitStatus = (payload: ChangeSwDocumentStatusPayload) => {
    if (!documentId) return;
    changeStatusMut.mutate(
      { id: documentId, payload },
      {
        onSuccess: () => {
          message.success(payload.statusCode === 'in_ips' ? 'Размещение в IPS зафиксировано' : 'Статус изменён');
          invalidateComments();
          setStatusOpen(false);
          setIpsOpen(false);
        },
        onError: fail,
      },
    );
  };

  const submitEdit = (payload: UpdateSwDocumentPayload) => {
    if (!documentId) return;
    updateDocMut.mutate(
      { id: documentId, payload },
      {
        onSuccess: data => {
          if (data.warnings?.length) message.warning(data.warnings.join(' '));
          else message.success('Документ обновлён');
          setEditOpen(false);
        },
        onError: fail,
      },
    );
  };

  const handleArchive = () => {
    if (!documentId) return;
    modal.confirm({
      title: 'Перевести документ в архив?',
      content: 'Документ исчезнет из действующего комплекта, но останется в своде и архиве программы.',
      okText: 'В архив',
      okButtonProps: { danger: true },
      onOk: () =>
        archiveDocMut.mutate(documentId, {
          onSuccess: () => message.success('Документ в архиве'),
          onError: fail,
        }),
    });
  };

  const handleRestore = () => {
    if (!documentId) return;
    restoreDocMut.mutate(documentId, {
      onSuccess: () => message.success('Документ восстановлен'),
      onError: fail,
    });
  };

  if ((docQuery.isLoading && !document) || (itemQuery.isLoading && !item)) return <Loader />;
  if (docQuery.isError || !document || itemQuery.isError || !item) {
    return <NotFound errorMessage='Документ не найден' />;
  }

  const locked = document.statusCode === 'in_ips';
  const isArchived = document.recordState === 'archived';
  const isItemArchived = item.recordState === 'archived';
  const canEditDocument = canEdit && !isArchived && !isItemArchived;
  const canRestoreDocument = canEdit && isArchived && !document.archivedByCascade && !isItemArchived;
  const filesCount =
    (docFilesQuery.data?.length ?? 0) + (document.approvalSheet ? (sheetFilesQuery.data?.length ?? 0) : 0);
  const statusLabel = statusByCode.get(document.statusCode) ?? document.statusCode;
  const sheetStatusLabel = document.approvalSheet?.statusCode
    ? statusByCode.get(document.approvalSheet.statusCode)
    : undefined;
  const ipsDisplay = formatIpsDisplay(document.ips?.id ?? null, document.ips?.placedAt ?? null);

  const openStatus = (scope: 'document' | 'sheet') => {
    setStatusScope(scope);
    setStatusOpen(true);
  };

  const handleSetupSheet = () => {
    if (!documentId) return;
    updateDocMut.mutate(
      { id: documentId, payload: { approvalSheet: { sheetsCount: 1 } } },
      {
        onSuccess: () => message.success('Лист утверждения оформлен'),
        onError: fail,
      },
    );
  };

  const showSetupSheet =
    canEditDocument && !locked && item.developmentKindCode === 'rnd' && !document.approvalSheet;

  return (
    <>
      <DetailPageHeader
        title={document.designation}
        titleWeight='medium'
        backLabel={`${item.designation} · ${item.shortName}`}
        onBack={handleBack}
        statusBadge={
          isArchived
            ? { label: 'архивный', variant: 'neutral' as const }
            : {
                label: formatSwStatusLabel(statusLabel, document.statusCode),
                variant: document.statusCode === 'in_ips' ? ('info' as const) : ('success' as const),
              }
        }
        metaItems={[
          <span key='kind' className={styles.headerMetaChip}>
            {kindLabel}
          </span>,
          <span key='meta' className={styles.headerMetaChip}>
            {document.sheetsCount} листов{document.letter ? ` · литера ${document.letter}` : ''}
          </span>,
        ]}
        subtitle={document.name}
        actions={
          canEdit ? (
            <>
              {canEditDocument ? (
                <Button type='primary' icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                  Редактировать
                </Button>
              ) : null}
              {canRestoreDocument ? (
                <Button icon={<UndoOutlined />} className={styles.restoreBtn} onClick={handleRestore}>
                  Вернуть из архива
                </Button>
              ) : canEditDocument ? (
                <Button className={styles.archiveBtn} onClick={handleArchive}>
                  В архив
                </Button>
              ) : null}
            </>
          ) : undefined
        }
        tabs={[
          { key: 'main', label: 'Основная информация' },
          { key: 'files', label: `Файлы (${filesCount})` },
        ]}
        activeTab={cardTab}
        onTabChange={key => setCardTab(key as DocTab)}
      >
        {cardTab === 'main' ? (
        <>
        <div className={styles.sectionCard}>
          <h3 className={styles.cardTitle}>Реквизиты документа</h3>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Наименование</span>
              <span className={styles.infoValue}>{document.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Статус документа</span>
              <span className={styles.infoValue}>
                {canEditDocument && !locked ? (
                  <button type='button' className={styles.statusBadgeBtn} onClick={() => openStatus('document')}>
                    <span className={swStatusBadgeClass(document.statusCode, styles)}>
                      {formatSwStatusLabel(statusLabel, document.statusCode)}
                    </span>
                  </button>
                ) : (
                  <span className={swStatusBadgeClass(document.statusCode, styles)}>
                    {formatSwStatusLabel(statusLabel, document.statusCode)}
                  </span>
                )}
              </span>
            </div>
            {document.approvalSheet ? (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Обозначение ЛУ</span>
                  <span className={styles.infoValue}>{document.approvalSheet.designation ?? '—'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Наименование ЛУ</span>
                  <span className={styles.infoValue}>{document.name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Статус листа утверждения</span>
                  <span className={styles.infoValue}>
                    {canEditDocument && !locked ? (
                      <button type='button' className={styles.statusBadgeBtn} onClick={() => openStatus('sheet')}>
                        <span className={swStatusBadgeClass(document.approvalSheet.statusCode ?? '', styles)}>
                          {formatSwStatusLabel(sheetStatusLabel, document.approvalSheet.statusCode ?? '')}
                        </span>
                      </button>
                    ) : (
                      <span className={swStatusBadgeClass(document.approvalSheet.statusCode ?? '', styles)}>
                        {formatSwStatusLabel(sheetStatusLabel, document.approvalSheet.statusCode ?? '')}
                      </span>
                    )}
                  </span>
                </div>
              </>
            ) : null}
            {showSetupSheet ? (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Лист утверждения</span>
                <span className={styles.infoValue}>
                  <button type='button' className={styles.docTableLinkBtn} onClick={handleSetupSheet}>
                    не оформлен · оформить
                  </button>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.cardTitleRowBetween}>
            <h3 className={styles.cardTitle}>Размещение в IPS</h3>
            {canEditDocument && !locked && !ipsDisplay ? (
              <Button type='primary' onClick={() => setIpsOpen(true)}>
                Зафиксировать размещение
              </Button>
            ) : null}
          </div>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Идентификатор записи в IPS</span>
              <span className={styles.infoValue}>{document.ips?.id ?? '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Дата размещения</span>
              <span className={styles.infoValue}>
                {document.ips?.placedAt
                  ? new Date(document.ips.placedAt).toLocaleDateString('ru-RU')
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <h3 className={styles.cardTitle}>Комментарии и основания смены статуса</h3>
          <CommentsList
            entityType='sw_document'
            entityId={documentId}
            embedded
            readOnly={!canEditDocument}
          />
        </div>
        </>
        ) : null}

        {cardTab === 'files' && documentId ? (
          <div className={styles.sectionCard}>
            <SwDocumentFilesTab
              documentId={documentId}
              hasApprovalSheet={Boolean(document.approvalSheet)}
              canEdit={canEditDocument && !locked}
            />
          </div>
        ) : null}
      </DetailPageHeader>

      <SwDocumentEditModal
        open={editOpen}
        document={document}
        confirmLoading={updateDocMut.isPending}
        onCancel={() => setEditOpen(false)}
        onSubmit={submitEdit}
      />

      <SwDocumentStatusModal
        open={statusOpen}
        document={{
          id: document.id,
          designation: document.designation,
          documentKindCode: document.documentKindCode,
          kindSequenceNo: document.kindSequenceNo,
          name: document.name,
          sheetsCount: document.sheetsCount,
          letter: document.letter,
          statusCode: document.statusCode,
          sheetDesignation: document.approvalSheet?.designation ?? null,
          sheetSheetsCount: document.approvalSheet?.sheetsCount ?? null,
          sheetStatusCode: document.approvalSheet?.statusCode ?? null,
          ipsId: document.ips?.id ?? null,
          ipsPlacedAt: document.ips?.placedAt ?? null,
          recordState: document.recordState,
        }}
        scope={statusScope}
        currentStatusCode={
          statusScope === 'sheet' ? document.approvalSheet?.statusCode ?? null : document.statusCode
        }
        confirmLoading={changeStatusMut.isPending}
        onCancel={() => setStatusOpen(false)}
        onSubmit={submitStatus}
      />
      <SwIpsPlacementModal
        open={ipsOpen}
        document={{
          id: document.id,
          designation: document.designation,
          documentKindCode: document.documentKindCode,
          kindSequenceNo: document.kindSequenceNo,
          name: document.name,
          sheetsCount: document.sheetsCount,
          letter: document.letter,
          statusCode: document.statusCode,
          sheetDesignation: document.approvalSheet?.designation ?? null,
          sheetSheetsCount: document.approvalSheet?.sheetsCount ?? null,
          sheetStatusCode: document.approvalSheet?.statusCode ?? null,
          ipsId: document.ips?.id ?? null,
          ipsPlacedAt: document.ips?.placedAt ?? null,
          recordState: document.recordState,
        }}
        confirmLoading={changeStatusMut.isPending}
        onCancel={() => setIpsOpen(false)}
        onSubmit={submitStatus}
      />
    </>
  );
}
