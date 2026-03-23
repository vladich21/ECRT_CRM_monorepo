import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { PartnerType } from '../../../types/partner';
import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import {
  useCreatePartnerType,
  useDeletePartnerType,
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
    modalData: { name: getNameById(currentPartnerTypeId, data), nameLabel: 'название типа контрагента' },
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
  const onDelete = ({ id }: { id: string }) => {
    setAction('delete');
    setCurrentPartnerTypeId(id);
  };
  const onEdit = ({ id }: { id: string }) => {
    setAction('edit');
    setCurrentPartnerTypeId(id);
  };
  return (
    <ReferenceBookListPage
      title='Типы контрагентов'
      addButtonLabel='Добавить тип контрагента'
      onAdd={handleOpenAddModal}
      contextHolder={contextHolder}
    >
      <ReferenceBookCardList>
        {data.map(partnerType => (
          <ReferenceBookItemCard
            key={partnerType.id}
            title={partnerType.name}
            onEdit={() => onEdit({ id: partnerType.id })}
            onDelete={() => onDelete({ id: partnerType.id })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
};
export default PartnerTypesListPage;
