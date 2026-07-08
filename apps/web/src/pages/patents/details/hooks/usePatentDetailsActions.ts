import { useNavigate } from 'react-router-dom';

import { useDeletePatent, useRestorePatent } from '@/api/patents/patentApiHooks';
import { useConfirmByModal } from '@/hooks/modals/useConfirmByModal';
import { useNotification } from '@/hooks/notifications/useNotification';
import type { ActionType } from '@/pages/patents/types/PatentsListPage.types';

export function usePatentDetailsActions(patentId: string, returnTab: ActionType) {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const deleteMutation = useDeletePatent();
  const restoreMutation = useRestorePatent();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteMutation,
    successMessage: 'Патент успешно удален',
    errorMessage: 'Не удалось удалить патент',
    redirectPath: '/patents',
    getMutationProps: () => patentId,
    showNotification,
  });

  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Патент успешно восстановлен',
    errorMessage: 'Не удалось восстановить патент',
    redirectPath: '/patents',
    getMutationProps: () => patentId,
    showNotification,
  });

  const handleEdit = () => navigate(`/patents/${patentId}/edit`);

  const handleBack = (backPath: string) => {
    if (backPath !== '/patents') {
      navigate(backPath);
      return;
    }
    navigate('/patents', {
      state: { tab: returnTab },
    });
  };

  return {
    contextHolder,
    handleEdit,
    handleBack,
    openDeleteModal,
    openRestoreModal,
  };
}
