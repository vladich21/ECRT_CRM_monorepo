import { useEffect, useState } from 'react';
import { Spin } from 'antd';

import {
  useCreatePatentArea,
  useDeletePatentArea,
  usePatentAreas,
  useUpdatePatentArea,
} from '../../../api/patents/patentAreasApiHooks';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { useModalStore } from '../../../store/ModalStore';
import { PatentArea } from '../../../types/patent';
import styles from './PatentAreasListPage.module.scss';

type ActionType = 'edit' | 'delete' | 'add' | '';
const PatentAreasListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePatentAreas();
  const [currentAreaId, setCurrentAreaId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();
  const deleteAreaMutation = useDeletePatentArea();
  const editAreaMutation = useUpdatePatentArea();
  const addAreaMutation = useCreatePatentArea();
  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteAreaMutation,
    successMessage: 'Область патентных заявок успешно удалена',
    errorMessage: 'Не удалось удалить область патентных заявок',
    getMutationProps: () => currentAreaId,
    showNotification,
  });
  const { handleOpenModal: openMutateModal } = useMutateByModal<PatentArea, Error>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editAreaMutation : addAreaMutation,
    successMessage: `Область патентных заявок успешно ${action === 'edit' ? 'изменена' : 'добавлена'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} область патентных заявок`,
    modalType: 'patentAreaForm',
    modalData: {
      name: getNameById(currentAreaId, data),
      description: getEntityById(currentAreaId, data)?.description,
      code: getEntityById(currentAreaId, data)?.code,
    },
    getMutationProps: action === 'edit' ? () => currentAreaId : () => undefined,
    showNotification,
  });
  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentAreaId, action]);
  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);
  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentAreaId('');
  };
  const onDelete = ({ id }: { id: string }) => {
    setAction('delete');
    setCurrentAreaId(id);
  };
  const onEdit = ({ id }: { id: string }) => {
    setAction('edit');
    setCurrentAreaId(id);
  };
  return (
    <ReferenceBookListPage
      title='Области патентных заявок'
      addButtonLabel='Добавить область патентных заявок'
      onAdd={handleOpenAddModal}
      contextHolder={contextHolder}
    >
      {loading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>Области патентных заявок не найдены</div>
      ) : (
        <ReferenceBookCardList>
          {data.map(area => (
            <ReferenceBookItemCard
              key={area.id}
              title={area.name || '—'}
              metaText={area.code}
              description={area.description}
              onEdit={() => onEdit({ id: area.id })}
              onDelete={() => onDelete({ id: area.id })}
            />
          ))}
        </ReferenceBookCardList>
      )}
    </ReferenceBookListPage>
  );
};
export default PatentAreasListPage;
