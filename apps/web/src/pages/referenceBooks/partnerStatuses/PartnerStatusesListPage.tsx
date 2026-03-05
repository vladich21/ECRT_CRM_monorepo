import { Button } from 'antd';
import BasicTable from '../../../components/basicTable/BasicTable';
import { PartnerStatus } from '../../../types/partner';

import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import {
  useCreatePartnerStatus,
  useDeletePartnerStatus,
  usePartnerStatuses,
  useUpdatePartnerStatus,
} from '../../../api/partners/partnerStatusApiHooks';
import { columns } from './data';
import { getNameById } from '../../../helpers/getNameById';

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
    <div>
      {contextHolder}
      <h1>Статусы контрагентов</h1>
      <Button type='primary' onClick={handleOpenAddModal} style={{ marginBottom: 16 }}>
        Добавить статус контрагента
      </Button>

      <BasicTable<PartnerStatus>
        data={data}
        loading={loading}
        columns={columns}
        showActions={true}
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
      />
    </div>
  );
};

export default PartnerStatusesListPage;
