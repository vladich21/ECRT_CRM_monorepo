import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  NumberOutlined,
  ProjectOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { useDeleteProject, useProjectById, useRestoreProject } from '../../../api/projects/projectApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, {
  detailHeaderVariantForProjectStatus,
  detailPageHeaderStyles as hStyles,
} from '../../../components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '../../../constants/deletionScope';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getNameById } from '../../../helpers/getNameById';
import styles from './ProjectDetails.module.scss';
import { PROJECT_STATUS_CONFIG } from './ProjectsListPage.types';
import type { ProjectsListNavSnapshot } from './utils/projectsListNavSnapshot';

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}
function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: project, isLoading, isError } = useProjectById(projectId!);
  const { data: referenceBooks, isLoading: isRefsLoading } = useReferenceData(['users']);
  const mutation = useDeleteProject();
  const restoreMutation = useRestoreProject();
  const navState = location.state as {
    deletionScope?: DeletionScope;
    projectsListReturn?: ProjectsListNavSnapshot;
  } | null;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const projectsListReturn = navState?.projectsListReturn;
  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Проект успешно удалён',
    errorMessage: 'Не удалось удалить проект',
    getMutationProps: () => projectId!,
    showNotification,
    redirectPath: '/projects',
    redirectReplace: true,
    redirectState: { deletionScope: 'deleted' as const },
  });
  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Проект успешно восстановлен',
    errorMessage: 'Не удалось восстановить проект',
    getMutationProps: () => projectId!,
    showNotification,
    redirectPath: '/projects',
    redirectReplace: true,
    redirectState: { listTab: 'all' as const },
  });
  if (isLoading || isRefsLoading) return <Loader />;
  if (isError || !project) return <NotFound errorMessage='Проект не найден' />;
  const st = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active;
  const managerName = getNameById(project.manager_id, referenceBooks?.users) || '';
  const purchaserName = getNameById(project.purchaser_id ?? '', referenceBooks?.users) || '';
  return (
    <DetailPageHeader
      title={project.name}
      backLabel='Проекты'
      onBack={() =>
        navigate('/projects', {
          state: {
            deletionScope: listDeletionScope,
            ...(projectsListReturn ? { projectsListReturn } : {}),
          },
        })
      }
      statusBadge={
        project.is_deleted
          ? { label: 'Удалён', variant: 'danger' }
          : { label: st.label, variant: detailHeaderVariantForProjectStatus(project.status) }
      }
      metaItems={[
        project.code && (
          <span key='code' className={hStyles.metaText}>
            Код: {project.code}
          </span>
        ),
        project.short_name && project.short_name !== project.name && (
          <span key='short' className={hStyles.metaText}>
            {project.short_name}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button
            type='primary'
            icon={<EditOutlined />}
            disabled={!!project.is_deleted}
            onClick={() => navigate(`/projects/${projectId}/edit`)}
          >
            Редактировать
          </Button>
          {project.is_deleted ? (
            <Button
              type='primary'
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Восстановить
            </Button>
          ) : (
            <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
              Удалить
            </Button>
          )}
        </>
      }
      tabs={[{ key: 'main', label: 'Основное' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
    >
      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <div className={styles.kpiRow}>
            <div className={styles.kpiTile}>
              <div className={styles.kpiContent}>
                <div>
                  <div className={styles.kpiValue}>{project.code || '—'}</div>
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
                  <div className={styles.kpiValue}>{formatDate(project.start_date)}</div>
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
                  <div className={styles.kpiValue}>{formatDate(project.end_date)}</div>
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
                background: st.background,
                border: `1px solid ${st.borderColor}`,
                color: st.color,
              }}
            >
              {st.label}
            </span>
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
    </DetailPageHeader>
  );
}
