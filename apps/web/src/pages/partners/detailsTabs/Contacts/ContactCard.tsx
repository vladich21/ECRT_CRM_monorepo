import { Button, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import type { PartnerContact } from '../../../../types/partner';
import styles from './ContactCard.module.scss';

interface ContactCardProps {
  contact: PartnerContact;
  onEdit: (contact: PartnerContact) => void;
  onDelete: (contact: PartnerContact) => void;
}

export default function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{contact.full_name || '—'}</span>
          {contact.is_primary && (
            <Tag color="success" className={styles.primaryTag}>
              Основной
            </Tag>
          )}
        </div>
        {contact.position && (
          <div className={styles.metaRow}>
            <span className={styles.position}>{contact.position}</span>
          </div>
        )}
        <div className={styles.contactRow}>
          {contact.phone && (
            <span className={styles.contactItem}>
              <PhoneOutlined />
              {contact.phone}
            </span>
          )}
          {contact.email && (
            <span className={styles.contactItem}>
              <MailOutlined />
              {contact.email}
            </span>
          )}
          {!contact.phone && !contact.email && (
            <span className={styles.contactItem}>Контакты не указаны</span>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(contact);
          }}
          aria-label="Редактировать"
        />
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(contact);
          }}
          aria-label="Удалить"
        />
      </div>
    </div>
  );
}
