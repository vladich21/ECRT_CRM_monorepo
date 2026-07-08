import { useRef } from 'react';
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

import {
  useCreatePatentArea,
  useDeletePatentArea,
  usePatentAreas,
  useUpdatePatentArea,
} from '@/api/patents/patentAreasApiHooks';
import ReferenceBookListPage from '@/components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '@/components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '@/components/referenceBooks/ReferenceBookItemCard';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { useOpenAntdDeleteConfirm } from '@/hooks/modals/confirmDelete';
import { useMutateByModal } from '@/hooks/modals/useMutateByModal';
import { useNotification } from '@/hooks/notifications/useNotification';
import { PatentArea } from '@/types/patent';

import styles from './PatentAreasListPage.module.scss';

const PatentAreasListPage: React.FC = () => {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePatentAreas();
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const deleteAreaMutation = useDeletePatentArea();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const editAreaMutation = useUpdatePatentArea();
  const addAreaMutation = useCreatePatentArea();
  const { handleOpenModal: openEditModal } = useMutateByModal<PatentArea, Error>({
    isEdit: true,
    mutation: editAreaMutation,
    successMessage: 'Область патентных заявок успешно изменена',
    errorMessage: 'Не удалось изменить область патентных заявок',
    modalType: 'patentAreaForm',
    getModalData: () => ({
      name: getNameById(editIdRef.current, data),
      description: getEntityById(editIdRef.current, data)?.description,
      code: getEntityById(editIdRef.current, data)?.code,
    }),
    getMutationProps: () => editIdRef.current,
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<PatentArea, Error>({
    isEdit: false,
    mutation: addAreaMutation,
    successMessage: 'Область патентных заявок успешно добавлена',
    errorMessage: 'Не удалось добавить область патентных заявок',
    modalType: 'patentAreaForm',
    modalData: { name: '', description: '', code: '' },
    getMutationProps: () => undefined,
    showNotification,
  });
  const onDelete = ({ id }: { id: string }) => {
    deleteIdRef.current = id;
    openDeleteConfirm({
      mutation: deleteAreaMutation,
      getVariables: () => deleteIdRef.current,
      showNotification,
      successMessage: 'Область патентных заявок успешно удалена',
      errorMessage: 'Не удалось удалить область патентных заявок',
      navigate,
    });
  };
  const onEdit = ({ id }: { id: string }) => {
    editIdRef.current = id;
    openEditModal();
  };
  return (
    <ReferenceBookListPage
      title='Области патентных заявок'
      addButtonLabel='Добавить область патентных заявок'
      onAdd={() => openAddModal()}
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
              title={area.name || '-'}
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
