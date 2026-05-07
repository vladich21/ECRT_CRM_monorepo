import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useCreatePartnerEconomicCategory,
  useDeletePartnerEconomicCategory,
  usePartnerEconomicCategories,
  useUpdatePartnerEconomicCategory,
} from '../../../api/partners/partnerEconomicCategoryApiHooks';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { useOpenAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { PartnerEconomicCategory } from '../../../types/partner';

const PartnerEconomicCategoriesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [] } = usePartnerEconomicCategories();
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const deleteCategoryMutation = useDeletePartnerEconomicCategory();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const editCategoryMutation = useUpdatePartnerEconomicCategory();
  const addCategoryMutation = useCreatePartnerEconomicCategory();
  const { handleOpenModal: openEditModal } = useMutateByModal<PartnerEconomicCategory, Error>({
    isEdit: true,
    mutation: editCategoryMutation,
    successMessage: 'Экономическая категория успешно изменена',
    errorMessage: 'Не удалось изменить экономическую категорию',
    modalType: 'withDescription',
    getModalData: () => ({
      name: getNameById(editIdRef.current, data),
      code: getEntityById(editIdRef.current, data)?.code,
      description: getEntityById(editIdRef.current, data)?.description,
      nameLabel: 'название экономической категории контрагентов',
      showCode: true,
    }),
    getMutationProps: () => editIdRef.current,
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<PartnerEconomicCategory, Error>({
    isEdit: false,
    mutation: addCategoryMutation,
    successMessage: 'Экономическая категория успешно добавлена',
    errorMessage: 'Не удалось добавить экономическую категорию',
    modalType: 'withDescription',
    modalData: {
      name: '',
      code: '',
      description: '',
      nameLabel: 'название экономической категории контрагентов',
      showCode: true,
    },
    getMutationProps: () => undefined,
    showNotification,
  });
  const onDelete = ({ id }: { id: string }) => {
    deleteIdRef.current = id;
    openDeleteConfirm({
      mutation: deleteCategoryMutation,
      getVariables: () => deleteIdRef.current,
      showNotification,
      successMessage: 'Экономическая категория успешно удалена',
      errorMessage: 'Не удалось удалить экономическую категорию',
      navigate,
    });
  };
  const onEdit = ({ id }: { id: string }) => {
    editIdRef.current = id;
    openEditModal();
  };
  return (
    <ReferenceBookListPage
      title='Экономические категории контрагентов'
      addButtonLabel='Добавить экономическую категорию'
      onAdd={() => openAddModal()}
      contextHolder={contextHolder}
    >
      <ReferenceBookCardList>
        {data.map(category => (
          <ReferenceBookItemCard
            key={category.id}
            title={category.name}
            metaText={category.code ? `Код: ${category.code}` : undefined}
            description={category.description || undefined}
            onEdit={() => onEdit({ id: category.id })}
            onDelete={() => onDelete({ id: category.id })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
};
export default PartnerEconomicCategoriesListPage;
