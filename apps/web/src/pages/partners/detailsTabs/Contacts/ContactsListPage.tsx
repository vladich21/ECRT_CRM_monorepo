import { useEffect, useState } from 'react';
import { useNotification } from '../../../../customhooks/useNotification';
import { Button, Spin } from 'antd';
import { useConfirmByModal } from '../../../../customhooks/useConfirmByModal';
import { useMutateByModal } from '../../../../customhooks/useMutateByModal';
import { useModalStore } from '../../../../store/ModalStore';
import { getEntityById } from '../../../../helpers/getEntityById';
import type { PartnerContact } from '../../../../types/partner';
import { initialPartnerContactValues } from './data';
import {
  useCreatePartnerContact,
  useDeletePartnerContact,
  usePartnerContacts,
  useUpdatePartnerContact,
} from '../../../../api/partners/partnerContactApiHooks';
import ContactCard from './ContactCard';
import { useParams } from 'react-router-dom';
import styles from './ContactsListPage.module.scss';
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
  const onDelete = (contact: PartnerContact) => {
    setAction('delete');
    setCurrentContactId(contact.id);
  };
  const onEdit = (contact: PartnerContact) => {
    setAction('edit');
    setCurrentContactId(contact.id);
  };
  return (
    <div className={styles.wrapper}>
      {contextHolder}
      <div className={styles.header}>
        <h3 className={styles.title}>Контактные лица</h3>
        <Button type='primary' onClick={handleOpenAddModal}>
          Добавить контакт
        </Button>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>Контактные лица не добавлены</div>
      ) : (
        <div className={styles.list}>
          {data.map(contact => (
            <ContactCard key={contact.id} contact={contact} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};
export default PartnerContactsListPage;
