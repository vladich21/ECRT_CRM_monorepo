import { CalendarOutlined, NumberOutlined, ProjectOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';

import styles from '../ProjectDetails.module.scss';
import type { ProjectDetailsOutletContext } from './projectDetailsOutletContext';
import { formatDateRu } from '@/utils/formatDate';


function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export default function ProjectDetailsMainTab() {
  const { project, managerName, purchaserName, statusLabel, statusBadgeStyle } =
    useOutletContext<ProjectDetailsOutletContext>();

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <div className={styles.kpiRow}>
          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{project.code || '-'}</div>
                <div className={styles.kpiLabel}>Код</div>
              </div>
              <div className={styles.kpiIcon}>
                <NumberOutlined />
              </div>
            </div>
          </div>
          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{formatDateRu(project.start_date, '-')}</div>
                <div className={styles.kpiLabel}>Начало</div>
              </div>
              <div className={styles.kpiIcon}>
                <CalendarOutlined />
              </div>
            </div>
          </div>
          <div className={styles.kpiTile}>
            <div className={styles.kpiContent}>
              <div>
                <div className={styles.kpiValue}>{formatDateRu(project.end_date, '-')}</div>
                <div className={styles.kpiLabel}>Окончание</div>
              </div>
              <div className={styles.kpiIcon}>
                <CalendarOutlined />
              </div>
            </div>
          </div>
        </div>

        {project.short_name && project.short_name !== project.name && (
          <div className={styles.card}>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Короткое название</span>
                <span className={styles.infoValue}>{project.short_name}</span>
              </div>
            </div>
          </div>
        )}

        {project.description && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Описание</h3>
            <div className={styles.descriptionText}>{project.description}</div>
          </div>
        )}
      </div>

      <div className={styles.sidebar}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Статус</h3>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              background: statusBadgeStyle.background,
              border: `1px solid ${statusBadgeStyle.borderColor}`,
              color: statusBadgeStyle.color,
            }}
          >
            {statusLabel}
          </span>
          <div className={styles.infoRows} style={{ marginTop: 12 }}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>В диаграмме Ганта</span>
              <span className={styles.infoValue}>
                {project.plan_in_gantt === false ? 'Нет' : 'Да'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <ProjectOutlined style={{ marginRight: 6 }} />
            Руководитель
          </h3>
          {managerName ? (
            <div className={styles.managerItem}>
              <div className={styles.managerAvatar}>{getInitials(managerName)}</div>
              <span className={styles.managerName}>{managerName}</span>
            </div>
          ) : (
            <span className={styles.infoValueMuted} style={{ fontSize: 13 }}>
              Не назначен
            </span>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            <ProjectOutlined style={{ marginRight: 6 }} />
            Ответственный закупщик
          </h3>
          {purchaserName ? (
            <div className={styles.managerItem}>
              <div className={styles.managerAvatar}>{getInitials(purchaserName)}</div>
              <span className={styles.managerName}>{purchaserName}</span>
            </div>
          ) : (
            <span className={styles.infoValueMuted} style={{ fontSize: 13 }}>
              Не назначен
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
