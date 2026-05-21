import { Suspense } from 'react';
import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useFilesByEntity } from '../../../api/files/fileApiHooks';
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
import {
  getInternalReturnBackLabel,
  resolveInternalReturnPath,
} from '../../../helpers/internalReturnNavigation';
import { PROJECT_STATUS_CONFIG } from './ProjectsListPage.types';
import type { ProjectDetailsOutletContext } from './tabs/projectDetailsOutletContext';
import type { ProjectsListNavSnapshot } from './utils/projectsListNavSnapshot';
import {
  getActiveProjectDetailsTab,
  getProjectDetailsTabPath,
  type ProjectDetailsTabKey,
} from './utils/projectDetailsTabs';

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: project, isLoading, isError } = useProjectById(projectId!);
  const { data: referenceBooks, isLoading: isRefsLoading } = useReferenceData(['users']);
  const { data: projectFiles = [], isLoading: isProjectFilesLoading } = useFilesByEntity('project', projectId!);
  const mutation = useDeleteProject();
  const restoreMutation = useRestoreProject();
  const navState = location.state as {
    from?: string;
    deletionScope?: DeletionScope;
    projectsListReturn?: ProjectsListNavSnapshot;
  } | null;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const projectsListReturn = navState?.projectsListReturn;
  const backPath = resolveInternalReturnPath(navState?.from, '/projects');
  const backLabel = getInternalReturnBackLabel(backPath, 'Проекты');
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

  const activeTab = getActiveProjectDetailsTab(location.pathname);

  const handleTabChange = (key: string) => {
    if (!projectId) return;
    navigate(getProjectDetailsTabPath(projectId, key as ProjectDetailsTabKey), { state: location.state });
  };

  if (isLoading || isRefsLoading) return <Loader />;
  if (isError || !project) return <NotFound errorMessage='Проект не найден' />;
  const st = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active;
  const managerName = getNameById(project.manager_id, referenceBooks?.users) || '';
  const purchaserName = getNameById(project.purchaser_id ?? '', referenceBooks?.users) || '';

  const documentsTabLabel =
    isProjectFilesLoading && projectFiles === undefined
      ? 'Проектные документы'
      : `Проектные документы (${projectFiles.length})`;

  const outletContext: ProjectDetailsOutletContext = {
    project,
    managerName,
    purchaserName,
    statusLabel: st.label,
    statusBadgeStyle: {
      background: st.background,
      borderColor: st.borderColor,
      color: st.color,
    },
  };

  return (
    <DetailPageHeader
      title={project.name}
      backLabel={backLabel}
      onBack={() => {
        if (backPath !== '/projects') {
          navigate(backPath);
          return;
        }
        navigate('/projects', {
          state: {
            deletionScope: listDeletionScope,
            ...(projectsListReturn ? { projectsListReturn } : {}),
          },
        });
      }}
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
      tabs={[
        { key: 'main', label: 'Основное' },
        { key: 'project-documents', label: documentsTabLabel },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <Suspense fallback={<Loader />}>
        <Outlet context={outletContext} />
      </Suspense>
    </DetailPageHeader>
  );
}
