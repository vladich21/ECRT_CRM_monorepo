import { useRef } from 'react';
import { Button, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useCreatePartnerContact,
  useDeletePartnerContact,
  usePartnerContacts,
  useUpdatePartnerContact,
} from '../../../../api/partners/partnerContactApiHooks';
import { useOpenAntdDeleteConfirm } from '../../../../customhooks/confirmDelete';
import { useMutateByModal } from '../../../../customhooks/useMutateByModal';
import { useNotification } from '../../../../customhooks/useNotification';
import { buildContactFormModalData } from '../../../../helpers/partnerContactPhoneHelpers';
import { getEntityById } from '../../../../helpers/getEntityById';
import type { PartnerContact } from '../../../../types/partner';
import ContactCard from './ContactCard';
import styles from './ContactsListPage.module.scss';
import { initialPartnerContactValues } from './data';

const PartnerContactsListPage: React.FC = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePartnerContacts(partnerId!);
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const deleteContactMutation = useDeletePartnerContact();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const editContactMutation = useUpdatePartnerContact();
  const addContactMutation = useCreatePartnerContact();
  const { handleOpenModal: openEditModal } = useMutateByModal<PartnerContact>({
    isEdit: true,
    mutation: editContactMutation,
    successMessage: 'Контакт успешно изменен',
    errorMessage: 'Не удалось изменить контакт',
    modalTitle: 'Редактирование контакта',
    modalType: 'contactForm',
    getModalData: () => {
      const existing = getEntityById<PartnerContact>(editIdRef.current, data);
      return buildContactFormModalData(existing ?? {}, {
        hasPrimaryContact: data.some((c: PartnerContact) => c.is_primary),
      });
    },
    getMutationProps: () => ({ partnerId: partnerId!, contactId: editIdRef.current }),
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<PartnerContact>({
    isEdit: false,
    mutation: addContactMutation,
    successMessage: 'Контакт успешно добавлен',
    errorMessage: 'Не удалось добавить контакт',
    modalTitle: 'Создание контакта',
    modalType: 'contactForm',
    getModalData: () => ({
      ...initialPartnerContactValues,
      hasPrimaryContact: data.some((c: PartnerContact) => c.is_primary),
      is_primary: false,
    }),
    getMutationProps: () => ({ partnerId: partnerId! }),
    showNotification,
  });
  const onDelete = (contact: PartnerContact) => {
    deleteIdRef.current = contact.id;
    openDeleteConfirm({
      mutation: deleteContactMutation,
      getVariables: () => ({ partnerId: partnerId!, contactId: deleteIdRef.current }),
      showNotification,
      successMessage: 'Контакт успешно удален',
      errorMessage: 'Не удалось удалить контакт',
      navigate,
    });
  };
  const onEdit = (contact: PartnerContact) => {
    editIdRef.current = contact.id;
    openEditModal();
  };
  return (
    <div className={styles.wrapper}>
      {contextHolder}
      <div className={styles.header}>
        <h3 className={styles.title}>Контактные лица</h3>
        <Button type='primary' onClick={() => openAddModal()}>
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
