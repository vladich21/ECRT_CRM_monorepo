import { useEffect, useState } from 'react';
import { useNotification } from '../../../../customhooks/useNotification';
import { Button } from 'antd';
import { useConfirmByModal } from '../../../../customhooks/useConfirmByModal';
import { useMutateByModal } from '../../../../customhooks/useMutateByModal';
import { useModalStore } from '../../../../store/ModalStore';
import BasicTable from '../../../../components/basicTable/BasicTable';
import { getEntityById } from '../../../../helpers/getEntityById';
import { PartnerContact } from '../../../../types/partner';
import { initialPartnerContactValues } from './data';
import {
  useCreatePartnerContact,
  useDeletePartnerContact,
  usePartnerContacts,
  useUpdatePartnerContact,
} from '../../../../api/partners/partnerContactApiHooks';
import { getColumnsData } from './data';
import { useParams } from 'react-router-dom';

type ActionType = 'edit' | 'delete' | 'add' | '';

const PartnerContactsListPage: React.FC = () => {
  const { partnerId } = useParams();
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePartnerContacts(partnerId!);
  const [currentContactId, setCurrentContactId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const modalProps = useModalStore();

  const deleteContactMutation = useDeletePartnerContact();
  const editContactMutation = useUpdatePartnerContact();
  const addContactMutation = useCreatePartnerContact();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteContactMutation,
    successMessage: 'Контакт успешно удален',
    errorMessage: 'Не удалось удалить контакт',
    getMutationProps: () => ({ partnerId: partnerId!, contactId: currentContactId }),
    showNotification,
  });

  const existingContact = getEntityById<PartnerContact>(currentContactId, data);
  const hasPrimaryContact = data.some((c: PartnerContact) => c.is_primary);
  const modalDataForContact =
    action === 'add'
      ? { ...initialPartnerContactValues, hasPrimaryContact, is_primary: false }
      : { ...existingContact, hasPrimaryContact };

  const { handleOpenModal: openMutateModal } = useMutateByModal<PartnerContact>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editContactMutation : addContactMutation,
    successMessage: `Контакт успешно ${action === 'edit' ? 'изменен' : 'добавлен'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} контакт`,
    modalType: 'contactForm',
    modalData: modalDataForContact,
    getMutationProps: () => (action === 'edit' ? { partnerId, contactId: currentContactId } : { partnerId }),
    showNotification,
  });

  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentContactId, action]);

  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);

  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentContactId('');
  };

  const onDelete = ({ id }: { id: string }) => {
    setAction('delete');
    setCurrentContactId(id.toString());
  };

  const onEdit = ({ id }: { id: string }) => {
    console.log('onEdit', id);
    setAction('edit');
    setCurrentContactId(id.toString());
  };

  return (
    <div>
      {contextHolder}
      <h1>Контакты поставщиков</h1>
      <Button type='primary' onClick={handleOpenAddModal} style={{ marginBottom: 16 }}>
        Добавить контакт
      </Button>

      <BasicTable<PartnerContact>
        data={data}
        loading={loading}
        columns={getColumnsData()}
        showActions={true}
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
      />
    </div>
  );
};

export default PartnerContactsListPage;
