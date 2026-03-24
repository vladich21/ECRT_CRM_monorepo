import { useEffect, useState } from 'react';

import {
  useCreatePartnerStatus,
  useDeletePartnerStatus,
  usePartnerStatuses,
  useUpdatePartnerStatus,
} from '../../../api/partners/partnerStatusApiHooks';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getNameById } from '../../../helpers/getNameById';
import { useModalStore } from '../../../store/ModalStore';
import { PartnerStatus } from '../../../types/partner';

type ActionType = 'edit' | 'delete' | 'add' | '';
const PartnerStatusesListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePartnerStatuses();
  const [currentPartnerStatusId, setCurrentPartnerStatusId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();
  const deletePartnerStatusMutation = useDeletePartnerStatus();
  const editPartnerStatusMutation = useUpdatePartnerStatus();
  const addPartnerStatusMutation = useCreatePartnerStatus();
  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePartnerStatusMutation,
    successMessage: 'Статус контрагента успешно удалён',
    errorMessage: 'Не удалось удалить статус контрагента',
    getMutationProps: () => currentPartnerStatusId,
    showNotification,
  });
  const { handleOpenModal: openMutateModal } = useMutateByModal<PartnerStatus, Error>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editPartnerStatusMutation : addPartnerStatusMutation,
    successMessage: `Статус контрагента успешно ${action === 'edit' ? 'изменён' : 'добавлен'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} статус контрагента`,
    modalType: 'positionForm',
    modalData: { name: getNameById(currentPartnerStatusId, data), nameLabel: 'название статуса контрагента' },
    getMutationProps: action === 'edit' ? () => currentPartnerStatusId : () => undefined,
    showNotification,
  });
  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentPartnerStatusId, action]);
  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);
  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentPartnerStatusId('');
  };
  const onDelete = ({ id }: { id: string }) => {
    setAction('delete');
    setCurrentPartnerStatusId(id);
  };
  const onEdit = ({ id }: { id: string }) => {
    setAction('edit');
    setCurrentPartnerStatusId(id);
  };
  return (
    <ReferenceBookListPage
      title='Статусы контрагентов'
      addButtonLabel='Добавить статус контрагента'
      onAdd={handleOpenAddModal}
      contextHolder={contextHolder}
    >
      <ReferenceBookCardList>
        {data.map(status => (
          <ReferenceBookItemCard
            key={status.id}
            title={status.name}
            onEdit={() => onEdit({ id: status.id })}
            onDelete={() => onDelete({ id: status.id })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
};
export default PartnerStatusesListPage;
