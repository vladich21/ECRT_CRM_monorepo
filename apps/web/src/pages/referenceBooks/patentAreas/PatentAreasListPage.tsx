import BasicTable from '../../../components/basicTable/BasicTable';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { PatentArea } from '../../../types/patent';

import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import {
  useCreatePatentArea,
  useDeletePatentArea,
  usePatentAreas,
  useUpdatePatentArea,
} from '../../../api/patents/patentAreasApiHooks';
import { getNameById } from '../../../helpers/getNameById';
import { columns } from './data';
import { getEntityById } from '../../../helpers/getEntityById';

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
    <ReferenceBookListPage title="Области патентных заявок" addButtonLabel="Добавить область патентных заявок" onAdd={handleOpenAddModal} contextHolder={contextHolder}>
      <BasicTable<PatentArea>
        data={data}
        loading={loading}
        columns={columns}
        showActions={true}
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
      />
    </ReferenceBookListPage>
  );
};

export default PatentAreasListPage;
