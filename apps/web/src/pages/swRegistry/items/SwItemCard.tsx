import { RightOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';

import type { SwItemListRow } from '@/types/swRegistry';
import { usePartnerShortName } from '../shared/usePartnerShortName';
import styles from './SwItemCard.module.scss';

type Props = {
  item: SwItemListRow;
  kindLabel?: string;
  statusLabels?: Map<string, string>;
  onClick: (item: SwItemListRow) => void;
  onRestore?: (item: SwItemListRow) => void;
  restoreLoading?: boolean;
};

function formatElementPath(element: SwItemListRow['element']) {
  return `${element.code} · ${element.name}`;
}

export function SwItemCard({ item, kindLabel, statusLabels, onClick, onRestore, restoreLoading }: Props) {
  const partnerLabel = usePartnerShortName(item.partner.id, item.partner.shortName || item.partner.name);
  const statusEntries = Object.entries(item.statusSummary ?? {}).filter(([, n]) => n > 0);
  const isArchived = item.recordState === 'archived';

  return (
    <div
      className={styles.card}
      {...(isArchived ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(item)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.cardHeading}>
          {item.designation} — {item.shortName}
          {isArchived ? (
            <Tag bordered={false} style={{ marginLeft: 8, fontSize: 12 }}>
              архивная
            </Tag>
          ) : null}
        </div>
        <div className={styles.responsibleRow}>
          <UserOutlined style={{ fontSize: 14, flexShrink: 0 }} />
          <span className={styles.responsibleName}>
            {item.responsible.name} · {partnerLabel}
          </span>
        </div>
        <div className={styles.chipsRow}>
          {kindLabel ? <Tag className={styles.kindChip}>{kindLabel}</Tag> : null}
          <Tag className={styles.elementChip}>{formatElementPath(item.element)}</Tag>
          <Tag className={styles.docsChip}>документов: {item.documentsCount}</Tag>
          {statusEntries.map(([code, n]) => {
            const label = statusLabels?.get(code) ?? code;
            return (
              <Tag key={code} bordered={false} className={styles.statusChip} color='processing'>
                {n > 1 ? `${label}: ${n}` : label}
              </Tag>
            );
          })}
        </div>
      </div>
      <div className={styles.cardTrailing}>
        {isArchived && onRestore ? (
          <Button
            size='small'
            icon={<UndoOutlined />}
            loading={restoreLoading}
            onClick={e => {
              e.stopPropagation();
              onRestore(item);
            }}
          >
            Вернуть из архива
          </Button>
        ) : null}
        <div className={styles.activityCol}>
          <RightOutlined className={styles.arrow} />
        </div>
      </div>
    </div>
  );
}
