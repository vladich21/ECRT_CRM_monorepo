import { useEffect, useState } from 'react';
import { Button, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Position } from '../../../types/referenceTypes';
import {
  useCreatePosition,
  useDeletePosition,
  usePositions,
  useUpdatePosition,
} from '../../../api/positions/positionApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { getNameById } from '../../../helpers/getNameById';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { PositionCard } from './PositionCard';
import styles from './PositionsListPage.module.scss';

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
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} должность`,
    modalType: 'positionForm',
    modalData: { name: getNameById(currentPositionId, data) },
    getMutationProps: action === 'edit' ? () => currentPositionId : () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOpenModal не стабилен
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

  const onDelete = (position: Position) => {
    setAction('delete');
    setCurrentPositionId(position.id);
  };

  const onEdit = (position: Position) => {
    setAction('edit');
    setCurrentPositionId(position.id);
  };

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton path="/" />
      <PageHeader
        title="Должности"
        subtitle="Справочник должностей"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
            Добавить должность
          </Button>
        }
      />

      {loading ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : (
        <div className={styles.cardList}>
          {data.length === 0 ? (
            <div className={styles.empty}>Должности не найдены</div>
          ) : (
            data.map((position) => (
              <PositionCard key={position.id} position={position} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PositionsListPage;
