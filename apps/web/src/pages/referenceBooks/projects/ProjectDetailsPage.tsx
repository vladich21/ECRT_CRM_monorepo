import { Suspense } from 'react';
import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, {
  detailHeaderVariantForProjectStatus,
  detailPageHeaderStyles as hStyles,
} from '@/components/pageLayout/DetailPageHeader';

import { useProjectDetailsActions } from './hooks/useProjectDetailsActions';
import { useProjectDetailsData } from './hooks/useProjectDetailsData';
import {
  getActiveProjectDetailsTab,
  getProjectDetailsTabPath,
  type ProjectDetailsTabKey,
} from './utils/projectDetailsTabs';

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    project,
    isLoading,
    isError,
    isRefsLoading,
    listDeletionScope,
    backPath,
    backLabel,
    statusConfig,
    documentsTabLabel,
    outletContext,
  } = useProjectDetailsData(projectId!);

  const { contextHolder, openDeleteModal, openRestoreModal, handleBack, handleEdit } =
    useProjectDetailsActions(projectId!, listDeletionScope);

  const activeTab = getActiveProjectDetailsTab(location.pathname);

  const handleTabChange = (key: string) => {
    if (!projectId) return;
    navigate(getProjectDetailsTabPath(projectId, key as ProjectDetailsTabKey), { state: location.state });
  };

  if (isLoading || isRefsLoading) return <Loader />;
  if (isError || !project || !statusConfig || !outletContext) {
    return <NotFound errorMessage='Проект не найден' />;
  }

  return (
    <DetailPageHeader
      title={project.name}
      backLabel={backLabel}
      onBack={() => handleBack(backPath)}
      statusBadge={
        project.is_deleted
          ? { label: 'Удален', variant: 'danger' }
          : { label: statusConfig.label, variant: detailHeaderVariantForProjectStatus(project.status) }
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
          <Button type='primary' icon={<EditOutlined />} disabled={!!project.is_deleted} onClick={handleEdit}>
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
            <Button type='primary' danger icon={<DeleteOutlined />} onClick={openDeleteModal}>
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
