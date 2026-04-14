import { CalendarOutlined, FileTextOutlined, NumberOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import {
  getPatentRecordSurface,
  getPatentRidWorkflowSurface,
  mutedTagStyle,
} from '../../constants/statusBadgeSurfaces';
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
  const deletedSurface = getPatentRecordSurface(true);
  const ridSurface = getPatentRidWorkflowSurface(statusName);

  return (
    <div
      className={styles.card}
      {...(patent.is_deleted ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(patent)}
    >
      {/* Основная информация */}
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
      <span className={styles.metaNumber}>
            <div style={{ fontSize: 16, marginRight: 4, fontWeight: 700}}>№ {patent.registration_number || '—'}</div>
          </span>
          <span className={styles.name}>{patent.name || '—'}</span>
        </div>
        <div className={styles.metaRow}>
          {patent.is_deleted ? (
            <Tag bordered={false} style={mutedTagStyle(deletedSurface, { fontSize: 12 })}>
              Удалён
            </Tag>
          ) : statusName ? (
            <Tag bordered={false} style={mutedTagStyle(ridSurface, { fontSize: 12 })}>
              {statusName}
            </Tag>
          ) : (
            <Tag bordered={false} style={mutedTagStyle(ridSurface, { fontSize: 12 })}>
              Статус не указан
            </Tag>
          )}
         
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

      {/* Дата регистрации + исполнители */}
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
            {patent.author_ids.length === 1
              ? 'исполнитель'
              : patent.author_ids.length <= 4
                ? 'исполнителя'
                : 'исполнителей'}
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
