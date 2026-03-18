import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { PartnerEconomicCategory } from '../../../types/partner';

import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import {
  useCreatePartnerEconomicCategory,
  useDeletePartnerEconomicCategory,
  usePartnerEconomicCategories,
  useUpdatePartnerEconomicCategory,
} from '../../../api/partners/partnerEconomicCategoryApiHooks';
import { getNameById } from '../../../helpers/getNameById';
import { getEntityById } from '../../../helpers/getEntityById';

type ActionType = 'edit' | 'delete' | 'add' | '';

const PartnerEconomicCategoriesListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePartnerEconomicCategories();
  const [currentCategoryId, setCurrentCategoryId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();

  const deleteCategoryMutation = useDeletePartnerEconomicCategory();
  const editCategoryMutation = useUpdatePartnerEconomicCategory();
  const addCategoryMutation = useCreatePartnerEconomicCategory();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteCategoryMutation,
    successMessage: 'Экономическая категория успешно удалена',
    errorMessage: 'Не удалось удалить экономическую категорию',
    getMutationProps: () => currentCategoryId,
    showNotification,
  });

  const { handleOpenModal: openMutateModal } = useMutateByModal<PartnerEconomicCategory, Error>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editCategoryMutation : addCategoryMutation,
    successMessage: `Экономическая категория успешно ${action === 'edit' ? 'изменена' : 'добавлена'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} экономическую категорию`,
    modalType: 'withDescription',
    modalData: {
      name: getNameById(currentCategoryId, data),
      code: getEntityById(currentCategoryId, data)?.code,
      description: getEntityById(currentCategoryId, data)?.description,
      nameLabel: 'название экономической категории контрагентов',
      showCode: true,
    },
    getMutationProps: action === 'edit' ? () => currentCategoryId : () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentCategoryId, action]);

  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);

  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentCategoryId('');
  };

  const onDelete = ({ id }: { id: string }) => {
    setAction('delete');
    setCurrentCategoryId(id);
  };

  const onEdit = ({ id }: { id: string }) => {
    setAction('edit');
    setCurrentCategoryId(id);
  };

  return (
    <ReferenceBookListPage title="Экономические категории контрагентов" addButtonLabel="Добавить экономическую категорию" onAdd={handleOpenAddModal} contextHolder={contextHolder}>
      <ReferenceBookCardList>
        {data.map((c) => (
          <ReferenceBookItemCard
            key={c.id}
            title={c.name}
            metaText={c.code ? `Код: ${c.code}` : undefined}
            description={c.description || undefined}
            onEdit={() => onEdit({ id: c.id })}
            onDelete={() => onDelete({ id: c.id })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
};

export default PartnerEconomicCategoriesListPage;
