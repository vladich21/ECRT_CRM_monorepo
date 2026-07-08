import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useCreatePartnerType,
  useDeletePartnerType,
  usePartnerTypes,
  useUpdatePartnerType,
} from '@/api/partners/partnerTypeApiHooks';
import ReferenceBookListPage from '@/components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '@/components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '@/components/referenceBooks/ReferenceBookItemCard';
import { getNameById } from '@/helpers/getNameById';
import { useOpenAntdDeleteConfirm } from '@/hooks/modals/confirmDelete';
import { useMutateByModal } from '@/hooks/modals/useMutateByModal';
import { useNotification } from '@/hooks/notifications/useNotification';
import { PartnerType } from '@/types/partner';

const PartnerTypesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [] } = usePartnerTypes();
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const deletePartnerTypeMutation = useDeletePartnerType();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const editPartnerTypeMutation = useUpdatePartnerType();
  const addPartnerTypeMutation = useCreatePartnerType();
  const { handleOpenModal: openEditModal } = useMutateByModal<PartnerType>({
    isEdit: true,
    mutation: editPartnerTypeMutation,
    successMessage: 'Тип контрагента успешно изменен',
    errorMessage: 'Не удалось изменить тип контрагента',
    modalType: 'positionForm',
    getModalData: () => ({
      name: getNameById(editIdRef.current, data),
      nameLabel: 'название типа контрагента',
    }),
    getMutationProps: () => editIdRef.current,
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<PartnerType>({
    isEdit: false,
    mutation: addPartnerTypeMutation,
    successMessage: 'Тип контрагента успешно добавлен',
    errorMessage: 'Не удалось добавить тип контрагента',
    modalType: 'positionForm',
    modalData: { name: '', nameLabel: 'название типа контрагента' },
    getMutationProps: () => undefined,
    showNotification,
  });
  const onDelete = ({ id }: { id: string }) => {
    deleteIdRef.current = id;
    openDeleteConfirm({
      mutation: deletePartnerTypeMutation,
      getVariables: () => deleteIdRef.current,
      showNotification,
      successMessage: 'Тип контрагента успешно удален',
      errorMessage: 'Не удалось удалить тип контрагента',
      navigate,
    });
  };
  const onEdit = ({ id }: { id: string }) => {
    editIdRef.current = id;
    openEditModal();
  };
  return (
    <ReferenceBookListPage
      title='Типы контрагентов'
      addButtonLabel='Добавить тип контрагента'
      onAdd={() => openAddModal()}
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
