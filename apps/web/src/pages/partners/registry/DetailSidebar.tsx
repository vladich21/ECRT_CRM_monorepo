import { EnvironmentOutlined, GlobalOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { Partner } from '../../../types/partner';
import styles from './DetailSidebar.module.scss';

const STATUS_COLORS: Record<string, string> = {
  Активный: '#52c41a',
  Потенциальный: '#1677ff',
  Заблокирован: '#ff4d4f',
  Архив: '#8c8c8c',
};
interface DetailSidebarProps {
  partner: Partner;
  references?: {
    partnerCategories?: Array<{
      id: string;
      name: string;
    }>;
    partnerStatuses?: Array<{
      id: string;
      name: string;
    }>;
    partnerTypes?: Array<{
      id: string;
      name: string;
    }>;
    partnerEconomicCategories?: Array<{
      id: string;
      name: string;
    }>;
  };
}
export default function DetailSidebar({ partner, references }: DetailSidebarProps) {
  const statusName = references?.partnerStatuses?.find(s => s.id === partner.status_id)?.name ?? '—';
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);
  const econCategory = references?.partnerEconomicCategories?.find(
    c => c.id === partner.partner_economic_category_id,
  )?.name;
  const categoryName = references?.partnerCategories?.find(c => c.id === partner.category_id)?.name ?? '—';
  const statusColor = STATUS_COLORS[statusName] ?? '#1677ff';
  const hasContact = partner.phone || partner.email || partner.website;
  return (
    <div className={styles.sidebar}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Контактная информация</h3>
        {hasContact ? (
          <div className={styles.contactItems}>
            {partner.phone && (
              <div className={styles.contactItem}>
                <PhoneOutlined className={styles.contactIcon} /> {partner.phone}
              </div>
            )}
            {partner.email && (
              <div className={styles.contactItem}>
                <MailOutlined className={styles.contactIcon} /> {partner.email}
              </div>
            )}
            {partner.website && (
              <div className={styles.contactItem}>
                <GlobalOutlined className={styles.contactIcon} /> {partner.website}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.contactItem} style={{ color: '#8c8c8c' }}>
            Не указана
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Классификация</h3>
        <div className={styles.classItems}>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Категория</span>
            <span className={styles.classValue}>{categoryName}</span>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Статус</span>
            <Tag color={statusColor} style={{ fontSize: 14 }}>
              {statusName}
            </Tag>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Утверждён</span>
            <Tag color={partner.is_approved ? '#52c41a' : '#ff4d4f'} style={{ fontSize: 14 }}>
              {partner.is_approved ? 'Да' : 'Нет'}
            </Tag>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Типы</span>
            <span className={styles.classValue}>{typeNames.length > 0 ? typeNames.join(', ') : '—'}</span>
          </div>
          <div className={styles.classRow}>
            <span className={styles.classLabel}>Экон. группа</span>
            <span className={styles.classValue}>{econCategory || '—'}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Реквизиты</h3>
        <div className={styles.classItems}>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>ИНН</span>
            <span className={styles.classValue}>{partner.inn || '—'}</span>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>КПП</span>
            <span className={styles.classValue}>{partner.kpp || '—'}</span>
          </div>
          <div className={styles.classRow}>
            <span className={styles.classLabel}>ОГРН</span>
            <span className={styles.classValue}>{partner.ogrn || '—'}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Адреса</h3>
        <div className={styles.contactItems}>
          {partner.legal_address ? (
            <div className={styles.contactItem}>
              <EnvironmentOutlined className={styles.contactIcon} />
              <div>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>Юридический</div>
                {partner.legal_address}
              </div>
            </div>
          ) : null}
          {partner.actual_address ? (
            <div className={styles.contactItem}>
              <EnvironmentOutlined className={styles.contactIcon} />
              <div>
                <div style={{ fontSize: 14, color: '#8c8c8c' }}>Фактический</div>
                {partner.actual_address}
              </div>
            </div>
          ) : null}
          {!partner.legal_address && !partner.actual_address && (
            <div className={styles.contactItem} style={{ color: '#8c8c8c' }}>
              Не указаны
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
