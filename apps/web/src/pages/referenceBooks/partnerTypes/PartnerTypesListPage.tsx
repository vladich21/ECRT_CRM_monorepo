import { Button, Form } from 'antd';
import BasicTable from '../../../components/basicTable/BasicTable';
import { PartnerType } from '../../../types/partner';

import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { columns } from './data';
import {
  useCreatePartnerType,
  useDeletePartnerType,
  usePartnerTypeById,
  usePartnerTypes,
  useUpdatePartnerType,
} from '../../../api/partners/partnerTypeApiHooks';
import { getNameById } from '../../../helpers/getNameById';

type ActionType = 'edit' | 'delete' | 'add' | '';

const PartnerTypesListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePartnerTypes();
  const [currentPartnerTypeId, setCurrentPartnerTypeId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();

  const deletePartnerTypeMutation = useDeletePartnerType();
  const editPartnerTypeMutation = useUpdatePartnerType();
  const addPartnerTypeMutation = useCreatePartnerType();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePartnerTypeMutation,
    successMessage: 'Тип контрагента успешно удален',
    errorMessage: 'Не удалось удалить тип контрагента',
    getMutationProps: () => currentPartnerTypeId,
    showNotification,
  });

  const { handleOpenModal: openMutateModal } = useMutateByModal<PartnerType>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editPartnerTypeMutation : addPartnerTypeMutation,
    successMessage: `Тип контрагента успешно ${action === 'edit' ? 'изменен' : 'добавлен'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} тип контрагента`,
    modalType: 'positionForm',
    modalData: { name: getNameById(+currentPartnerTypeId, data) },
    getMutationProps: action === 'edit' ? () => currentPartnerTypeId : () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentPartnerTypeId, action]);

  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);

  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentPartnerTypeId('');
  };

  const onDelete = ({ id }: { id: number }) => {
    setAction('delete');
    setCurrentPartnerTypeId(id.toString());
  };

  const onEdit = ({ id }: { id: number }) => {
    setAction('edit');
    setCurrentPartnerTypeId(id.toString());
  };

  return (
    <div>
      {contextHolder}
      <h1>Типы контрагентов</h1>
      <Button type='primary' onClick={handleOpenAddModal} style={{ marginBottom: 16 }}>
        Добавить тип контрагента
      </Button>

      <BasicTable<PartnerType>
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

export default PartnerTypesListPage;
