import { Button, Form } from 'antd';
import BasicTable from '../../../components/basicTable/BasicTable';
import { Position } from '../../../types/referenceTypes';
import { columns } from './data';
import {
  useCreatePosition,
  useDeletePosition,
  usePositionById,
  usePositions,
  useUpdatePosition,
} from '../../../api/positions/positionApiHooks';
import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { getNameById } from '../../../helpers/getNameById';

type ActionType = 'edit' | 'delete' | 'add' | '';

const PositionsListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePositions();
  const [currentPositionId, setCurrentPositionId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();

  const deletePositionMutation = useDeletePosition();
  const editPositionMutation = useUpdatePosition();
  const addPositionMutation = useCreatePosition();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePositionMutation,
    successMessage: 'Должность успешно удалена',
    errorMessage: 'Не удалось удалить должность',
    redirectPath: '/positions',
    getMutationProps: () => currentPositionId,
    showNotification,
  });

  const { handleOpenModal: openMutateModal } = useMutateByModal<Position>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editPositionMutation : addPositionMutation,
    successMessage: `Должность успешно ${action === 'edit' ? 'изменена' : 'добавлена'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'измененить' : 'добавить'} должность`,
    modalType: 'positionForm',
    modalData: { name: getNameById(+currentPositionId, data) },
    getMutationProps: action === 'edit' ? () => currentPositionId : () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentPositionId, action]);

  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);

  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentPositionId('');
  };

  const onDelete = ({ id }: { id: number }) => {
    setAction('delete');
    setCurrentPositionId(id.toString());
  };

  const onEdit = ({ id }: { id: number }) => {
    setAction('edit');
    setCurrentPositionId(id.toString());
  };

  return (
    <div>
      {contextHolder}
      <h1>Должности</h1>
      <Button type='primary' onClick={handleOpenAddModal} style={{ marginBottom: 16 }}>
        Добавить должность
      </Button>

      <BasicTable<Position>
        data={data}
        loading={loading}
        columns={columns}
        showActions={true}
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
        enableExport
      />
    </div>
  );
};

export default PositionsListPage;
