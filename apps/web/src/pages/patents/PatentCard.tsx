import { CalendarOutlined, FileTextOutlined, NumberOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import { getPatentRecordSurface, mutedTagStyle } from '../../constants/statusBadgeSurfaces';
import { getNameById } from '../../helpers/getNameById';
import { Patent } from '../../types/patent';
import type { ReferenceDataForPatents } from './data';
import styles from './PatentsListPage.module.scss';

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}


type Props = {
  patent: Patent;
  refs: ReferenceDataForPatents;
  onClick: (patent: Patent) => void;
};

export function PatentCard({ patent, refs, onClick }: Props) {
  const ipTypeName = getNameById(patent.intellectprop_id, refs?.patentIntellectProps) || '';
  const statusName = getNameById(patent.status_id, refs?.patentStatuses) || '';
  const deptName = getNameById(patent.department_id, refs?.departments) || '';
  const surface = getPatentRecordSurface(patent.is_deleted);
  const statusLabel = patent.is_deleted ? 'Удалён' : 'Активен';

  return (
    <div
      className={styles.card}
      {...(patent.is_deleted ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(patent)}
    >
      {/* Основная информация */}
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{patent.name || '—'}</span>
        </div>
        <div className={styles.metaRow}>
          <Tag bordered={false} style={mutedTagStyle(surface, { fontSize: 12 })}>
            {statusLabel}
          </Tag>
          {statusName && <Tag className={styles.chipSmall}>{statusName}</Tag>}
          <span className={styles.metaNumber}>
            <NumberOutlined style={{ fontSize: 11, marginRight: 4 }} />№ {patent.registration_number || '—'}
          </span>
        </div>
        {ipTypeName && (
          <div className={`${styles.metaRow} ${styles.metaSubRow}`}>
            <span>{ipTypeName}</span>
          </div>
        )}
        {deptName && (
          <div className={`${styles.metaRow} ${styles.metaSubRow}`}>
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
