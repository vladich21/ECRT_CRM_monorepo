import { Tag } from 'antd';
import { Link } from 'react-router-dom';

import { SURFACE_ACTIVE, SURFACE_BLOCKED, getPartnerStatusSurface, mutedTagStyle } from '../../../constants/statusBadgeSurfaces';
import type { Partner, PartnerContact } from '../../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../../utils/partnerApproval';
import styles from './DetailSidebar.module.scss';

/** Контакт для карточки сайдбара: основной или первый в списке. */
function pickFeaturedContact(contacts: PartnerContact[]): PartnerContact {
  return contacts.find(c => c.is_primary) ?? contacts[0];
}

function countOtherContacts(contacts: PartnerContact[], featuredId: string): number {
  return contacts.reduce((n, c) => n + (c.id === featuredId ? 0 : 1), 0);
}

/** «1 контакт / 2 контакта / 5 контактов» для фразы «Ещё N …». */
function pluralContactsRu(n: number): string {
  const x = Math.max(0, Math.floor(n));
  const m10 = x % 10;
  const m100 = x % 100;
  if (m100 >= 11 && m100 <= 14) return `${x} контактов`;
  if (m10 === 1) return `${x} контакт`;
  if (m10 >= 2 && m10 <= 4) return `${x} контакта`;
  return `${x} контактов`;
}

function websiteHref(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Строки «лейбл — значение» для блока «Контактные лица». */
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
          <span className={styles.classLabel}>Ещё контакты</span>
          <Link to={`/partners/${partnerId}/contacts`} className={styles.moreContactsLink}>
            Ещё {pluralContactsRu(extraCount)}
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
  const statusName = references?.partnerStatuses?.find(s => s.id === partner.status_id)?.name ?? '—';
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);
  const econCategory = references?.partnerEconomicCategories?.find(
    c => c.id === partner.partner_economic_category_id,
  )?.name;
  const categoryName = references?.partnerCategories?.find(c => c.id === partner.category_id)?.name ?? '—';
  const approvedByRules = computePartnerIsApproved({
    kind: inferPartnerCategoryKind(categoryName),
    legalCheckPassed: partner.legal_check_passed,
    questionnaireFilled: partner.questionnaire_filled,
    initialAssessmentDone: partner.initial_assessment_done,
    hasActiveSupplierEvaluationBlock: partner.has_active_evaluation_block ?? false,
  });
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
            <span className={styles.classValue}>{categoryName}</span>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Статус</span>
            <Tag bordered={false} style={mutedTagStyle(getPartnerStatusSurface(statusName), { fontSize: 14 })}>
              {statusName}
            </Tag>
          </div>
          <div className={styles.classRowBorder}>
            <span className={styles.classLabel}>Утверждён</span>
            <Tag
              bordered={false}
              style={mutedTagStyle(approvedByRules ? SURFACE_ACTIVE : SURFACE_BLOCKED, { fontSize: 14 })}
            >
              {approvedByRules ? 'Да' : 'Нет'}
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
