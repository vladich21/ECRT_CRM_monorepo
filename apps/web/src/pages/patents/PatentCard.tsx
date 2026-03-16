import { Tag, Tooltip } from 'antd';
import {
  CalendarOutlined,
  FileTextOutlined,
  RightOutlined,
  TeamOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import { Patent } from '../../types/patent';
import { getNameById } from '../../helpers/getNameById';
import type { ReferenceDataForPatents } from './data';
import styles from './PatentsListPage.module.scss';

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}

const STATUS_STYLE = {
  active: { color: '#52c41a', label: 'Активен' },
  deleted: { color: '#ff4d4f', label: 'Удалён' },
} as const;

type Props = {
  patent: Patent;
  refs: ReferenceDataForPatents;
  onClick: (patent: Patent) => void;
};

export function PatentCard({ patent, refs, onClick }: Props) {
  const ipTypeName = getNameById(patent.intellectprop_id, refs?.patentIntellectProps) || '';
  const statusName = getNameById(patent.status_id, refs?.patentStatuses) || '';
  const deptName = getNameById(patent.department_id, refs?.departments) || '';
  const st = patent.is_deleted ? STATUS_STYLE.deleted : STATUS_STYLE.active;

  return (
    <div
      className={styles.card}
      style={{ '--status-color': st.color } as React.CSSProperties}
      onClick={() => onClick(patent)}
    >
      {/* Основная информация */}
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <Tooltip title={patent.name}>
            <span className={styles.name}>{patent.name || '—'}</span>
          </Tooltip>
          <span className={styles.metaInn}>
            <NumberOutlined style={{ fontSize: 11, marginRight: 4 }} />
            № {patent.registration_number || '—'}
          </span>
        </div>
        <div className={styles.metaRow}>
          <Tag color={st.color} style={{ fontSize: 14 }}>{st.label}</Tag>
          {statusName && <Tag style={{ fontSize: 14 }}>{statusName}</Tag>}
        </div>
        {ipTypeName && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span>{ipTypeName}</span>
          </div>
        )}
        {deptName && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span className={styles.metaText}>
              <TeamOutlined style={{ fontSize: 11 }} />
              {deptName}
            </span>
          </div>
        )}
      </div>

      {/* Дата регистрации + авторы */}
      <div className={styles.metricsCol}>
        <div className={styles.statsBlock}>
          <div className={styles.statValue}>
            <CalendarOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {formatDate(patent.registration_date)}
          </div>
          <div className={styles.statLabel}>Дата регистрации</div>
        </div>
        {patent.author_ids?.length > 0 && (
          <div className={styles.periodInfo}>
            <FileTextOutlined style={{ fontSize: 11 }} />
            {patent.author_ids.length}{' '}
            {patent.author_ids.length === 1 ? 'автор' : patent.author_ids.length <= 4 ? 'автора' : 'авторов'}
          </div>
        )}
      </div>

      {/* Стрелка */}
      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
