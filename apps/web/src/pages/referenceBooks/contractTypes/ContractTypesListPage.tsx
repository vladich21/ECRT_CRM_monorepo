import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ContractType } from '../../../types/contract';

import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import {
  useCreateContractType,
  useDeleteContractType,
  useContractTypes,
  useUpdateContractType,
} from '../../../api/contracts/contractTypeApiHooks';
import { getNameById } from '../../../helpers/getNameById';
import { getEntityById } from '../../../helpers/getEntityById';

type ActionType = 'edit' | 'delete' | 'add' | '';

const ContractTypesListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = useContractTypes();
  const [currentTypeId, setCurrentTypeId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();

  const deleteTypeMutation = useDeleteContractType();
  const editTypeMutation = useUpdateContractType();
  const addTypeMutation = useCreateContractType();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteTypeMutation,
    successMessage: 'Тип договора успешно удален',
    errorMessage: 'Не удалось удалить тип договора',
    getMutationProps: () => currentTypeId,
    showNotification,
  });

  const { handleOpenModal: openMutateModal } = useMutateByModal<ContractType, Error>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editTypeMutation : addTypeMutation,
    successMessage: `Тип договора успешно ${action === 'edit' ? 'изменен' : 'добавлен'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} тип договора`,
    modalType: 'withDescription',
    modalData: {
      name: getNameById(currentTypeId, data),
      description: getEntityById(currentTypeId, data)?.description,
      nameLabel: 'название типа договора',
    },
    getMutationProps: action === 'edit' ? () => currentTypeId : () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentTypeId, action]);

  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);

  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentTypeId('');
  };

  const onDelete = ({ id }: { id: string }) => {
    setAction('delete');
    setCurrentTypeId(id);
  };

  const onEdit = ({ id }: { id: string }) => {
    setAction('edit');
    setCurrentTypeId(id);
  };

  return (
    <ReferenceBookListPage title="Типы договоров" addButtonLabel="Добавить тип договора" onAdd={handleOpenAddModal} contextHolder={contextHolder}>
      <ReferenceBookCardList>
        {data.map((t) => (
          <ReferenceBookItemCard
            key={t.id}
            title={t.name}
            description={t.description || undefined}
            onEdit={() => onEdit({ id: t.id })}
            onDelete={() => onDelete({ id: t.id })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
};

export default ContractTypesListPage;
