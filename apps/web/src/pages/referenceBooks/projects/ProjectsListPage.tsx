import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getColumnsData } from './data';
import BasicTable from '../../../components/basicTable/BasicTable';
import { Project } from '../../../types/referenceTypes';
import { useDeleteProject, useProjects } from '../../../api/projects/projectApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { NotFound } from '../../../components/notFound/NotFound';
import { useNotification } from '../../../customhooks/useNotification';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useEffect, useState } from 'react';

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, isError } = useProjects();

  const [currentProjectId, setCurrentProjectId] = useState('');
  const { showNotification, contextHolder } = useNotification();
  const deleteProjectMutation = useDeleteProject();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteProjectMutation,
    successMessage: 'Проект успешно удален',
    errorMessage: 'Не удалось удалить проект',
    getMutationProps: () => currentProjectId,
    showNotification,
  });

  useEffect(() => {
    if (currentProjectId) openDeleteModal();
  }, [currentProjectId]);

  const handleRowClick = (record: Project) => {
    navigate(`/projects/${record.id}`, {
      state: {
        project: record,
        from: 'projects-list',
      },
    });
  };

  const onEdit = (record: Project) => {
    navigate(`/projects/${record.id}/edit`, {});
  };

  const onDelete = (record: Project) => {
    setCurrentProjectId(record.id);
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div>
      {contextHolder}
      <h1>Проекты</h1>
      <Button type='primary' onClick={() => navigate('/projects/create')} style={{ marginBottom: 16 }}>
        Добавить проект
      </Button>

      <BasicTable<Project>
        data={projects}
        loading={isLoading}
        columns={getColumnsData()}
        onRowClick={handleRowClick}
        enableContextMenu={true}
        showActions
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
        enableExport
      />
    </div>
  );
}
