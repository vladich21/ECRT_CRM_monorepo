import { Button, Space, Tag } from 'antd';

import { CanAccess } from '@/components/canAccess/CanAccess';
import { SECTIONS } from '@/shared/permissions';
import type { SwDocumentListRow } from '@/types/swRegistry';
import styles from './SwItemDetailsPage.module.scss';

type Props = {
  document: SwDocumentListRow;
  kindLabel?: string;
  statusLabel?: string;
  sheetStatusLabel?: string;
  canEdit: boolean;
  onChangeStatus: (doc: SwDocumentListRow, scope: 'document' | 'sheet') => void;
};

export function SwDocumentCard({
  document,
  kindLabel,
  statusLabel,
  sheetStatusLabel,
  canEdit,
  onChangeStatus,
}: Props) {
  const locked = document.statusCode === 'in_ips';
  const isArchived = document.recordState === 'archived';

  return (
    <article className={styles.docCard} {...(isArchived ? { 'data-danger-stripe': true as const } : {})}>
      <div className={styles.docMain}>
        <div className={styles.docHeading}>
          <span>{document.designation}</span>
          <span>—</span>
          <span>{document.name}</span>
          <Tag>{kindLabel ?? document.documentKindCode}</Tag>
          {isArchived ? <Tag bordered={false}>архивный</Tag> : null}
        </div>
        <div className={styles.docMeta}>
          <span>№ {document.kindSequenceNo}</span>
          <span>Листов: {document.sheetsCount}</span>
          {document.letter ? <span>Литера: {document.letter}</span> : null}
          <Tag bordered={false} color='processing'>
            {statusLabel ?? document.statusCode}
          </Tag>
          {document.sheetStatusCode ? (
            <Tag bordered={false} color='purple'>
              Лист утв.: {sheetStatusLabel ?? document.sheetStatusCode}
            </Tag>
          ) : null}
          {document.ipsId ? <span>IPS: {document.ipsId}</span> : null}
        </div>
      </div>
      {canEdit && !locked ? (
        <Space className={styles.docActions} size={4} wrap>
          <CanAccess section={SECTIONS.SW_ITEMS} action='edit'>
            <Button size='small' onClick={() => onChangeStatus(document, 'document')}>
              Статус документа
            </Button>
            {document.sheetStatusCode ? (
              <Button size='small' onClick={() => onChangeStatus(document, 'sheet')}>
                Статус листа
              </Button>
            ) : null}
          </CanAccess>
        </Space>
      ) : null}
    </article>
  );
}
