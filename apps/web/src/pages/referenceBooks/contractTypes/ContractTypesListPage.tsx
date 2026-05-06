import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useContractTypes,
  useCreateContractType,
  useDeleteContractType,
  useUpdateContractType,
} from '../../../api/contracts/contractTypeApiHooks';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { useOpenAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { ContractType } from '../../../types/contract';

const ContractTypesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [] } = useContractTypes();
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const deleteTypeMutation = useDeleteContractType();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const editTypeMutation = useUpdateContractType();
  const addTypeMutation = useCreateContractType();
  const { handleOpenModal: openEditModal } = useMutateByModal<ContractType, Error>({
    isEdit: true,
    mutation: editTypeMutation,
    successMessage: 'Тип договора успешно изменен',
    errorMessage: 'Не удалось изменить тип договора',
    modalType: 'withDescription',
    getModalData: () => ({
      name: getNameById(editIdRef.current, data),
      description: getEntityById(editIdRef.current, data)?.description,
      nameLabel: 'название типа договора',
    }),
    getMutationProps: () => editIdRef.current,
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<ContractType, Error>({
    isEdit: false,
    mutation: addTypeMutation,
    successMessage: 'Тип договора успешно добавлен',
    errorMessage: 'Не удалось добавить тип договора',
    modalType: 'withDescription',
    modalData: {
      name: '',
      description: '',
      nameLabel: 'название типа договора',
    },
    getMutationProps: () => undefined,
    showNotification,
  });
  const onDelete = ({ id }: { id: string }) => {
    deleteIdRef.current = id;
    openDeleteConfirm({
      mutation: deleteTypeMutation,
      getVariables: () => deleteIdRef.current,
      showNotification,
      successMessage: 'Тип договора успешно удален',
      errorMessage: 'Не удалось удалить тип договора',
      navigate,
    });
  };
  const onEdit = ({ id }: { id: string }) => {
    editIdRef.current = id;
    openEditModal();
  };
  return (
    <ReferenceBookListPage
      title='Типы договоров'
      addButtonLabel='Добавить тип договора'
      onAdd={() => openAddModal()}
      contextHolder={contextHolder}
    >
      <ReferenceBookCardList>
        {data.map(contractType => (
          <ReferenceBookItemCard
            key={contractType.id}
            title={contractType.name}
            description={contractType.description || undefined}
            onEdit={() => onEdit({ id: contractType.id })}
            onDelete={() => onDelete({ id: contractType.id })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
};
export default ContractTypesListPage;
