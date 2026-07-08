import { useNavigate } from 'react-router-dom';

import { useDeleteProject, useRestoreProject } from '@/api/projects/projectApiHooks';
import type { DeletionScope } from '@/constants/deletionScope';
import { useConfirmByModal } from '@/hooks/modals/useConfirmByModal';
import { useNotification } from '@/hooks/notifications/useNotification';

export function useProjectDetailsActions(projectId: string, listDeletionScope: DeletionScope) {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const deleteMutation = useDeleteProject();
  const restoreMutation = useRestoreProject();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteMutation,
    successMessage: 'Проект успешно удален',
    errorMessage: 'Не удалось удалить проект',
    getMutationProps: () => projectId,
    showNotification,
    redirectPath: '/projects',
    redirectReplace: true,
    redirectState: { deletionScope: 'deleted' as const },
  });

  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Проект успешно восстановлен',
    errorMessage: 'Не удалось восстановить проект',
    getMutationProps: () => projectId,
    showNotification,
    redirectPath: '/projects',
    redirectReplace: true,
    redirectState: { listTab: 'all' as const },
  });

  const handleBack = (backPath: string) => {
    if (backPath !== '/projects') {
      navigate(backPath);
      return;
    }
    navigate('/projects', {
      state: { deletionScope: listDeletionScope },
    });
  };

  const handleEdit = () => navigate(`/projects/${projectId}/edit`);

  return {
    contextHolder,
    openDeleteModal,
    openRestoreModal,
    handleBack,
    handleEdit,
  };
}
