import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useCreatePartnerStatus,
  useDeletePartnerStatus,
  usePartnerStatuses,
  useUpdatePartnerStatus,
} from '../../../api/partners/partnerStatusApiHooks';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { useOpenAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getNameById } from '../../../helpers/getNameById';
import { PartnerStatus } from '../../../types/partner';

const PartnerStatusesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [] } = usePartnerStatuses();
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const deletePartnerStatusMutation = useDeletePartnerStatus();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const editPartnerStatusMutation = useUpdatePartnerStatus();
  const addPartnerStatusMutation = useCreatePartnerStatus();
  const { handleOpenModal: openEditModal } = useMutateByModal<PartnerStatus, Error>({
    isEdit: true,
    mutation: editPartnerStatusMutation,
    successMessage: 'Статус контрагента успешно изменён',
    errorMessage: 'Не удалось изменить статус контрагента',
    modalType: 'positionForm',
    getModalData: () => ({
      name: getNameById(editIdRef.current, data),
      nameLabel: 'название статуса контрагента',
    }),
    getMutationProps: () => editIdRef.current,
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<PartnerStatus, Error>({
    isEdit: false,
    mutation: addPartnerStatusMutation,
    successMessage: 'Статус контрагента успешно добавлен',
    errorMessage: 'Не удалось добавить статус контрагента',
    modalType: 'positionForm',
    modalData: { name: '', nameLabel: 'название статуса контрагента' },
    getMutationProps: () => undefined,
    showNotification,
  });
  const onDelete = ({ id }: { id: string }) => {
    deleteIdRef.current = id;
    openDeleteConfirm({
      mutation: deletePartnerStatusMutation,
      getVariables: () => deleteIdRef.current,
      showNotification,
      successMessage: 'Статус контрагента успешно удалён',
      errorMessage: 'Не удалось удалить статус контрагента',
      navigate,
    });
  };
  const onEdit = ({ id }: { id: string }) => {
    editIdRef.current = id;
    openEditModal();
  };
  return (
    <ReferenceBookListPage
      title='Статусы контрагентов'
      addButtonLabel='Добавить статус контрагента'
      onAdd={() => openAddModal()}
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
