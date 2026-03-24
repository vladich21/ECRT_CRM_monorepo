import { CalendarOutlined, RightOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import { PatentGrant } from '../../../types/patent';
import styles from './PatentGrantsListPage.module.scss';

function formatDate(dateStr?: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}
const STATUS_COLOR: Record<string, string> = {
  Активный: '#52c41a',
  Истек: '#8c8c8c',
  Отозван: '#ff4d4f',
};
type Props = {
  grant: PatentGrant;
  onClick: (grant: PatentGrant) => void;
  onEdit: (grant: PatentGrant) => void;
  onDelete: (grant: PatentGrant) => void;
};
export function PatentGrantCard({ grant, onClick, onEdit, onDelete }: Props) {
  const statusColor = STATUS_COLOR[grant.status] || '#1677ff';
  const dateStr = [formatDate(grant.grant_date), formatDate(grant.renewal_date)].filter(Boolean).join(' — ') || '—';
  return (
    <div
      className={styles.grantCard}
      style={{ '--status-color': statusColor } as React.CSSProperties}
      onClick={() => onClick(grant)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.grantNumber}>{grant.grant_number || '—'}</div>
        <Tag color={statusColor} style={{ fontSize: 13 }}>
          {grant.status}
        </Tag>
        {grant.office && <div className={styles.office}>{grant.office}</div>}
      </div>
      <div className={styles.metricsCol}>
        <div className={styles.statsBlock}>
          <div className={styles.statValue}>
            <CalendarOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {dateStr}
          </div>
          <div className={styles.statLabel}>Даты</div>
        </div>
      </div>
      <div className={styles.actionsCol}>
        <span
          className={styles.actionLink}
          onClick={e => {
            e.stopPropagation();
            onEdit(grant);
          }}
        >
          Редактировать
        </span>
        <span
          className={styles.actionLinkDanger}
          onClick={e => {
            e.stopPropagation();
            onDelete(grant);
          }}
        >
          Удалить
        </span>
      </div>
      <div className={styles.arrowCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
