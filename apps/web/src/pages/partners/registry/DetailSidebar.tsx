import { Tag } from 'antd';
import { Link } from 'react-router-dom';

import { SURFACE_ACTIVE, SURFACE_BLOCKED, getPartnerStatusSurface, mutedTagStyle } from '../../../constants/statusBadgeSurfaces';
import type { Partner, PartnerContact } from '../../../types/partner';
import { inferPartnerCategoryKind } from '../../../utils/partnerApproval';
import styles from './DetailSidebar.module.scss';

function pickFeaturedContact(contacts: PartnerContact[]): PartnerContact {
  return contacts.find(contact => contact.is_primary) ?? contacts[0];
}

function countOtherContacts(contacts: PartnerContact[], featuredId: string): number {
  return contacts.reduce(
    (count, contact) => count + (contact.id === featuredId ? 0 : 1),
    0,
  );
}

function pluralContactsRu(contactCount: number): string {
  const countFloored = Math.max(0, Math.floor(contactCount));
  const lastDigit = countFloored % 10;
  const lastTwoDigits = countFloored % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${countFloored} контактов`;
  if (lastDigit === 1) return `${countFloored} контакт`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${countFloored} контакта`;
  return `${countFloored} контактов`;
}

function websiteHref(raw: string): string {
  const trimmedUrl = raw.trim();
  if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
  return `https://${trimmedUrl}`;
}

function ContactInfoClassificationRows({
  partnerId,
  contact,
  extraCount,
}: {
  partnerId: string;
  contact: PartnerContact;
  extraCount: number;
}) {
  const phone = contact.phone?.trim();
  const email = contact.email?.trim();
  const name = contact.full_name?.trim() || '—';
  const position = contact.position?.trim();

  return (
    <div className={`${styles.classItems} ${styles.contactInfoRows}`}>
      <div className={styles.classRowBorder}>
        <span className={styles.classLabel}>ФИО</span>
        <span className={`${styles.classValue} ${styles.classValueMultiline}`}>{name}</span>
      </div>
      <div className={styles.classRowBorder}>
        <span className={styles.classLabel}>Должность</span>
        <span className={`${styles.classValue} ${styles.classValueMultiline}`}>{position || '—'}</span>
      </div>
      <div className={styles.classRowBorder}>
        <span className={styles.classLabel}>Телефон</span>
        {phone ? (
          <span className={styles.classValue}>{phone}</span>
        ) : (
          <span className={styles.classValue}>—</span>
        )}
      </div>
      <div className={styles.classRowBorder}>
        <span className={styles.classLabel}>Email</span>
        {email ? (
          <span className={`${styles.classValue} ${styles.classValueMultiline}`}>{email}</span>
        ) : (
          <span className={styles.classValue}>—</span>
        )}
      </div>
      <div className={styles.classRowBorder}>
        <span className={styles.classLabel}>Статус</span>
        {contact.is_primary ? (
          <Tag bordered={false} style={mutedTagStyle(SURFACE_ACTIVE, { fontSize: 14 })}>
            Основной
          </Tag>
        ) : (
          <span className={styles.classValue}>—</span>
        )}
      </div>
      {extraCount > 0 ? (
        <div className={`${styles.classRow} ${styles.moreContactsInGrid}`}>
          <span className={styles.classLabel}>Еще контакты</span>
          <Link to={`/partners/${partnerId}/contacts`} className={styles.moreContactsLink}>
            Еще {pluralContactsRu(extraCount)}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

interface DetailSidebarProps {
  partner: Partner;
  contacts?: PartnerContact[];
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
export default function DetailSidebar({ partner, references, contacts = [] }: DetailSidebarProps) {
  const statusName =
    references?.partnerStatuses?.find(status => status.id === partner.status_id)?.name ?? '—';
  const displayStatusName = partner.is_deleted ? 'Удален' : statusName;
  const displayStatusSurface = partner.is_deleted
    ? SURFACE_BLOCKED
    : getPartnerStatusSurface(statusName);
  const typeNames = (partner.type_ids ?? [])
    .map(typeId => references?.partnerTypes?.find(partnerType => partnerType.id === typeId)?.name)
    .filter(Boolean);
  const econCategory = references?.partnerEconomicCategories?.find(
    economicCategory => economicCategory.id === partner.partner_economic_category_id,
  )?.name;
  const categoryDisplayName =
    references?.partnerCategories?.find(category => String(category.id) === String(partner.category_id))?.name ??
    'Не указана';
  const categoryNameForRules = categoryDisplayName === 'Не указана' ? null : categoryDisplayName;
  const categoryKind = inferPartnerCategoryKind(categoryNameForRules);
  const isApproved = partner.is_approved;
  const website = partner.website?.trim();
  const partnerPhone = partner.phone?.trim();
  const partnerEmail = partner.email?.trim();

  const featured = contacts.length > 0 ? pickFeaturedContact(contacts) : null;
  const extraCount = featured ? countOtherContacts(contacts, featured.id) : 0;

  return (
    <div className={styles.sidebar}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Контакты контрагента</h3>
        <div className={styles.classItems}>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Телефон</span>
            {partnerPhone ? (
              <span className={styles.classValue}>{partnerPhone}</span>
            ) : (
              <span className={styles.classValue}>—</span>
            )}
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Email</span>
            {partnerEmail ? (
              <span className={`${styles.classValue} ${styles.classValueMultiline}`}>{partnerEmail}</span>
            ) : (
              <span className={styles.classValue}>—</span>
            )}
          </div>
          <div className={styles.classRow}>
            <span className={styles.classLabel}>Сайт</span>
            {website ? (
              <span className={styles.classValue}>
                <a href={websiteHref(website)} target='_blank' rel='noopener noreferrer' className={styles.moreContactsLink}>
                  {website}
                </a>
              </span>
            ) : (
              <span className={styles.classValue}>—</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Контактные лица</h3>
        {contacts.length === 0 ? (
          <div className={styles.emptyHint}>Контактные лица не добавлены</div>
        ) : featured ? (
          <ContactInfoClassificationRows partnerId={partner.id} contact={featured} extraCount={extraCount} />
        ) : null}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Классификация</h3>
        <div className={styles.classItems}>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Категория</span>
            {categoryKind === 'engineering' ? (
              <Tag bordered color='purple'>
                {categoryDisplayName}
              </Tag>
            ) : categoryKind === 'resource' ? (
              <Tag bordered color='blue'>
                {categoryDisplayName}
              </Tag>
            ) : (
              <span className={styles.classValue}>{categoryDisplayName}</span>
            )}
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Статус</span>
            <Tag bordered={false} style={mutedTagStyle(displayStatusSurface, { fontSize: 14 })}>
              {displayStatusName}
            </Tag>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Утвержден</span>
            <Tag
              bordered={false}
              style={mutedTagStyle(isApproved ? SURFACE_ACTIVE : SURFACE_BLOCKED, { fontSize: 14 })}
            >
              {isApproved ? 'Да' : 'Нет'}
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
    </div>
  );
}
