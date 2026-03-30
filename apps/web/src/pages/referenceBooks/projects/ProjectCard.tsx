import { CalendarOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import { mutedTagStyle } from '../../../constants/statusBadgeSurfaces';
import { Project } from '../../../types/referenceTypes';
import styles from './ProjectsListPage.module.scss';
import { PROJECT_STATUS_CONFIG } from './ProjectsListPage.types';

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}
type Props = {
  project: Project;
  managerName: string;
  onClick: (project: Project) => void;
};
export function ProjectCard({ project, managerName, onClick }: Props) {
  const st = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active;
  const dangerStripe =
    !!project.is_deleted || project.status === 'cancelled' || project.status === 'completed';
  const periodStr =
    project.start_date || project.end_date
      ? [project.start_date, project.end_date].filter(Boolean).map(formatDate).join(' — ')
      : '—';
  return (
    <div
      className={styles.card}
      {...(dangerStripe ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(project)}
    >
      <div className={styles.mainInfo}>    
        <div className={styles.projectName}>{project.name || '—'}</div>
        <div className={styles.metaRow}>
          <Tag bordered={false} style={mutedTagStyle(st, { fontSize: 14 })}>
            {st.label}
          </Tag>
        </div>
        {project.short_name && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span>{project.short_name}</span>
          </div>
        )}
        {managerName && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span className={styles.metaText}>
              <UserOutlined style={{ fontSize: 11 }} />
              {managerName}
            </span>
          </div>
        )}
      </div>

      <div className={styles.metricsCol}>
        <div className={styles.statsBlock}>
          <div className={styles.statValue}>
            <CalendarOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {periodStr}
          </div>
          <div className={styles.statLabel}>Период проекта</div>
        </div>
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
