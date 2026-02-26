import { Button } from 'antd';
import BasicTable from '../../../components/basicTable/BasicTable';
import { PartnerEconomicCategory } from '../../../types/partner';

import { useEffect, useState } from 'react';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import {
  useCreatePartnerEconomicCategory,
  useDeletePartnerEconomicCategory,
  usePartnerEconomicCategories,
  useUpdatePartnerEconomicCategory,
} from '../../../api/partners/partnerEconomicCategoryApiHooks';
import { getNameById } from '../../../helpers/getNameById';
import { columns } from './data';
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
      description: getEntityById(currentCategoryId, data)?.description,
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
    <div>
      {contextHolder}
      <h1>Экономические категории контрагентов</h1>
      <Button type='primary' onClick={handleOpenAddModal} style={{ marginBottom: 16 }}>
        Добавить экономическую категорию
      </Button>

      <BasicTable<PartnerEconomicCategory>
        data={data}
        loading={loading}
        columns={columns}
        showActions={true}
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
      />
    </div>
  );
};

export default PartnerEconomicCategoriesListPage;
