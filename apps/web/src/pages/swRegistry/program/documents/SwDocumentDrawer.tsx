import { useRef } from 'react';
import { Drawer, Tag } from 'antd';

import { useSwFiles } from '@/api/swRegistry/swRegistryApiHooks';
import { CommentsList } from '@/components/comments/CommentsList';
import type { SwDocumentListRow } from '@/types/swRegistry';

import { SwStatusBadge } from '../../shared/SwStatusBadge';
import { SwDocumentFilesTab } from '../files/SwFilesTab';
import styles from './SwDocumentDrawer.module.scss';

export type SwDocumentDrawerTab = 'files' | 'comments';

type Props = {
  /** Открытый документ; null — панель закрыта. */
  document: SwDocumentListRow | null;
  kindLabel?: string;
  statusLabel?: string;
  tab: SwDocumentDrawerTab;
  onTabChange: (tab: SwDocumentDrawerTab) => void;
  /** Комплект программы можно менять: есть право и программа не в архиве. */
  canEdit: boolean;
  onClose: () => void;
};

/**
 * Боковая панель документа комплекта: файлы документа и листа утверждения, комментарии с основаниями
 * смены статуса. Статусы и IPS остаются в строке таблицы — здесь их не дублируем.
 */
export function SwDocumentDrawer({ document, kindLabel, statusLabel, tab, onTabChange, canEdit, onClose }: Props) {
  // Пока панель закрывается, документа уже нет — показываем последний, иначе шапка мигнёт пустой.
  const lastDocument = useRef<SwDocumentListRow | null>(null);
  if (document) lastDocument.current = document;
  const shown = document ?? lastDocument.current;

  const documentId = shown?.id;
  const hasSheet = Boolean(shown?.sheetStatusCode);
  // Счётчик вкладки — из тех же запросов, что грузит сама вкладка: кэш общий, лишних обращений нет.
  const docFilesQuery = useSwFiles('sw_document', documentId, Boolean(documentId));
  const sheetFilesQuery = useSwFiles('sw_sheet', documentId, Boolean(documentId) && hasSheet);

  const isArchived = shown?.recordState === 'archived';
  const locked = shown?.statusCode === 'in_ips';
  const canEditDocument = canEdit && !isArchived;
  const filesCount = (docFilesQuery.data?.length ?? 0) + (hasSheet ? (sheetFilesQuery.data?.length ?? 0) : 0);

  const tabs: { key: SwDocumentDrawerTab; label: string; count?: number }[] = [
    { key: 'files', label: 'Файлы', count: filesCount },
    { key: 'comments', label: 'Комментарии' },
  ];

  return (
    <Drawer
      open={document != null}
      onClose={onClose}
      width={560}
      destroyOnHidden
      title={
        shown ? (
          <div className={styles.docDrawerTitle}>
            <span className={styles.docDrawerDesignation}>{shown.designation}</span>
            <span className={styles.docDrawerName}>{shown.name}</span>
          </div>
        ) : null
      }
    >
      {shown ? (
        <div className={styles.docDrawerBody}>
          <div className={styles.docDrawerMeta}>
            {kindLabel ? (
              <Tag bordered={false} className={styles.programKind}>
                {kindLabel}
              </Tag>
            ) : null}
            <span className={styles.docDrawerMetaText}>
              {shown.sheetsCount} л.{shown.letter ? ` · литера ${shown.letter}` : ''}
            </span>
            <SwStatusBadge statusCode={shown.statusCode} label={statusLabel} />
            {isArchived ? (
              <Tag bordered={false} className={styles.programKind}>
                архивный
              </Tag>
            ) : null}
          </div>
          {/* В таблице у листа утверждения только статус: его обозначение видно здесь. */}
          {shown.sheetDesignation ? (
            <div className={styles.docDrawerMetaText}>
              Лист утверждения: <span className={styles.docDrawerDesignation}>{shown.sheetDesignation}</span>
              {shown.sheetSheetsCount ? ` · ${shown.sheetSheetsCount} л.` : ''}
            </div>
          ) : null}

          <div className={styles.programTabs} role='tablist'>
            {tabs.map(t => (
              <button
                key={t.key}
                type='button'
                role='tab'
                aria-selected={tab === t.key}
                className={tab === t.key ? styles.programTabActive : styles.programTab}
                onClick={() => onTabChange(t.key)}
              >
                {t.label}
                {t.count != null ? <span className={styles.filterTabCount}>{t.count}</span> : null}
              </button>
            ))}
          </div>

          {/* key по документу: смена документа без закрытия панели не унесёт черновик комментария или загрузку в чужой. */}
          {tab === 'files' ? (
            <SwDocumentFilesTab
              key={shown.id}
              documentId={shown.id}
              hasApprovalSheet={hasSheet}
              canEdit={canEditDocument && !locked}
              compact
            />
          ) : (
            <CommentsList
              key={shown.id}
              entityType='sw_document'
              entityId={shown.id}
              embedded
              readOnly={!canEditDocument}
            />
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
