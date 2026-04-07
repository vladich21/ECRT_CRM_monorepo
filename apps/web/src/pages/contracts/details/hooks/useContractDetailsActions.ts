import { useCallback } from 'react';

import { useDeleteContract, useRestoreContract } from '../../../../api/contracts/contractApiHooks';
import type { ContractDeleteResult } from '../../../../api/contracts/contractApi';
import { useConfirmByModal } from '../../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../../customhooks/useNotification';
import type { Contract } from '../../../../types/contract';
import type { FilterTab } from '../../list/ContractsListPage.types';
import { isContractDraft } from '../../utils/contractStateUtils';
import type { ReferenceData } from '../../../../api/hooks/useReferences';

type NavBase = Record<string, unknown>;

export function useContractDetailsActions(
  contractId: string,
  contractsListPath: string,
  detailNavBase: NavBase,
  contract: Contract | undefined,
  contractStates: ReferenceData['contractStates'] | undefined,
) {
  const { contextHolder, showNotification } = useNotification();
  const deleteContractMutation = useDeleteContract();
  const restoreContractMutation = useRestoreContract();

  const { handleOpenModal } = useConfirmByModal<ContractDeleteResult>({
    mutation: deleteContractMutation,
    successMessage: (data: ContractDeleteResult) =>
      data.deletion_mode === 'hard'
        ? 'Черновик удалён безвозвратно'
        : 'Договор перемещён в удалённые',
    errorMessage: 'Не удалось удалить договор',
    getMutationProps: () => contractId,
    showNotification,
    redirectPath: contractsListPath,
    redirectReplace: true,
    redirectState: (data: ContractDeleteResult) => ({
      ...detailNavBase,
      deletionScope: data.deletion_mode === 'hard' ? ('active' as const) : ('deleted' as const),
    }),
  });

  const { handleOpenModal: openRestoreModalBase } = useConfirmByModal({
    mutation: restoreContractMutation,
    successMessage: 'Договор успешно восстановлен',
    errorMessage: 'Не удалось восстановить договор',
    getMutationProps: () => contractId,
    showNotification,
    redirectPath: contractsListPath,
    redirectReplace: true,
    redirectState: { ...detailNavBase, listTab: 'all' as FilterTab },
  });

  const openRestoreModal = useCallback(() => {
    openRestoreModalBase({
      title: 'Восстановить договор?',
      content: 'Договор снова появится в основном реестре и будет доступен для редактирования.',
      okText: 'Восстановить',
    });
  }, [openRestoreModalBase]);

  const handleDelete = () => {
    if (!contract) return;
    if (isContractDraft(contract.state_id, contractStates)) {
      handleOpenModal({
        title: 'Удалить черновик безвозвратно?',
        content:
          'Черновик договора будет удалён навсегда. Восстановить его нельзя — запись исчезнет из системы.',
        okText: 'Удалить навсегда',
        confirmAppearance: 'delete',
      });
    } else {
      handleOpenModal();
    }
  };

  return { handleDelete, openRestoreModal, contextHolder };
}
