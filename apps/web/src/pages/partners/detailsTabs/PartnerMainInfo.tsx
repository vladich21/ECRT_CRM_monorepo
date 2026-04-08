import { BankOutlined, CopyOutlined, EnvironmentOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Descriptions, Space, Tooltip, Typography, message } from 'antd';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { renderCompetenceTag } from '../../../components/ui/renderTag';
import { getEntityById } from '../../../helpers/getEntityById';
import { Partner } from '../../../types/partner';
import styles from './PartnerMainInfo.module.scss';

const { Text } = Typography;

function copyText(text: string, successMessage: string) {
  void navigator.clipboard.writeText(text).then(
    () => {
      message.success(successMessage);
    },
    () => {
      message.error('Не удалось скопировать');
    },
  );
}

interface PartnersMainInfoProps {
  partner?: Partner;
}

function RequisiteCell({
  label,
  value,
  className,
  valueClassName,
  copyable = true,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  copyable?: boolean;
}) {
  const trimmed = value.trim();
  const display = trimmed || '—';

  return (
    <div className={`${styles.requisiteCell} ${className ?? ''}`.trim()}>
      <div className={styles.requisiteTop}>
        <span className={styles.requisiteLabel}>{label}</span>
        {copyable && trimmed ? (
          <Tooltip title={`Копировать ${label}`}>
            <Button
              type='text'
              size='small'
              className={styles.copyBtn}
              icon={<CopyOutlined />}
              aria-label={`Копировать ${label}`}
              onClick={() => copyText(trimmed, `${label} скопирован в буфер`)}
            />
          </Tooltip>
        ) : null}
      </div>
      <span className={`${styles.requisiteValue} ${valueClassName ?? ''}`.trim()}>{display}</span>
    </div>
  );
}

export default function PartnersMainInfo({ partner }: PartnersMainInfoProps) {
  const { data: referenceBooks } = useReferenceData([
    'partnerTypes',
    'partnerStatuses',
    'competencies',
    'partnerEconomicCategories',
  ]);

  return (
    <div className={styles.card}>
      <section className={styles.section} aria-labelledby='partner-overview-general'>
        <h3 id='partner-overview-general' className={styles.sectionTitle}>
          <ProfileOutlined className={styles.sectionTitleIcon} aria-hidden />
          Общая информация
        </h3>
        <Descriptions column={1} bordered size='middle' className={styles.descriptions}>
          <Descriptions.Item label='Полное наименование'>
            {partner?.name || <Text type='secondary'>Не указано</Text>}
          </Descriptions.Item>

          <Descriptions.Item label='Краткое наименование'>
            {partner?.short_name || <Text type='secondary'>Не указано</Text>}
          </Descriptions.Item>

          <Descriptions.Item label='Компетенции'>
            {partner?.competence_ids && partner.competence_ids.length > 0 ? (
              <Space wrap>
                {partner.competence_ids.map(competenceId =>
                  renderCompetenceTag(getEntityById(competenceId, referenceBooks?.competencies)),
                )}
              </Space>
            ) : (
              <Text type='secondary'>Компетенции не указаны</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label='Комментарий'>
            {partner?.comment || <Text type='secondary'>Нет комментария</Text>}
          </Descriptions.Item>
        </Descriptions>
      </section>

      <div className={styles.sectionDivider} role='separator' />

      <section className={styles.section} aria-labelledby='partner-overview-requisites'>
        <h3 id='partner-overview-requisites' className={styles.sectionTitle}>
          <BankOutlined className={styles.sectionTitleIcon} aria-hidden />
          Реквизиты
        </h3>
        <p className={styles.requisitesHint}>Идентификационные данные юридического лица</p>
        <div className={styles.requisitesGrid}>
          <RequisiteCell label='ИНН' value={partner?.inn ?? ''} />
          <RequisiteCell label='КПП' value={partner?.kpp ?? ''} />
          <RequisiteCell label='ОГРН' value={partner?.ogrn ?? ''} />
        </div>
        <h4 className={styles.addressesTitle}>
          <EnvironmentOutlined className={styles.sectionTitleIcon} aria-hidden />
          Адреса
        </h4>
        <div className={styles.addressesGrid}>
          <RequisiteCell label='Юридический адрес' value={partner?.legal_address ?? ''} />
          <RequisiteCell label='Фактический адрес' value={partner?.actual_address ?? ''} />
        </div>
      </section>

    </div>
  );
}
export { default as PartnerMainInfoTab } from '../registry/PartnerOverviewTab';
