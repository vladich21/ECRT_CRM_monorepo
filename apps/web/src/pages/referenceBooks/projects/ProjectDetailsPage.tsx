import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  NumberOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useDeleteProject, useProjectById } from '../../../api/projects/projectApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { getNameById } from '../../../helpers/getNameById';
import { PROJECT_STATUS_CONFIG } from './ProjectsListPage.types';
import styles from './ProjectDetails.module.scss';

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

const STATUS_TAG_CLASS: Record<string, string> = {
  active: 'tagGreen',
  completed: 'tagBlue',
  pending: 'tagOrange',
  paused: 'tagGray',
  cancelled: 'tagRed',
};

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data: project, isLoading, isError } = useProjectById(projectId!);
  const { data: referenceBooks, isLoading: isRefsLoading } = useReferenceData(['users']);
  const mutation = useDeleteProject();

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Проект успешно удалён',
    errorMessage: 'Не удалось удалить проект',
    redirectPath: '/projects',
    getMutationProps: () => projectId!,
    showNotification,
  });

  if (isLoading || isRefsLoading) return <Loader />;
  if (isError || !project) return <NotFound errorMessage="Проект не найден" />;

  const st = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active;
  const managerName = getNameById(project.manager_id, referenceBooks?.users) || '';
  const tagClass = STATUS_TAG_CLASS[project.status] || 'tagGray';

  return (
    <DetailPageHeader
      title={project.name}
      backLabel="Проекты"
      onBack={() => navigate('/projects')}
      statusBadge={{ label: st.label, color: st.color }}
      metaItems={[
        project.code && (
          <span key="code" className={hStyles.metaText}>Код: {project.code}</span>
        ),
        project.short_name && project.short_name !== project.name && (
          <span key="short" className={hStyles.metaText}>{project.short_name}</span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/projects/${projectId}/edit`)}>
            Редактировать
          </Button>
          <Button type="primary" danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
            Удалить
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Основное' }]}
      activeTab="main"
      onTabChange={() => {}}
      contextHolder={contextHolder}
    >
      {/* Content — 2-column layout */}
      <div className={styles.layout}>
        {/* Left column */}
        <div className={styles.leftColumn}>
          {/* Код и сроки */}
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

          {/* Короткое название — только если есть и отличается от названия */}
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

          {/* Описание */}
          {project.description && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Описание</h3>
              <div className={styles.descriptionText}>{project.description}</div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Статус</h3>
            <span className={styles[tagClass]}>{st.label}</span>
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
              <span className={styles.infoValueMuted} style={{ fontSize: 13 }}>Не назначен</span>
            )}
          </div>
        </div>
      </div>
    </DetailPageHeader>
  );
}
