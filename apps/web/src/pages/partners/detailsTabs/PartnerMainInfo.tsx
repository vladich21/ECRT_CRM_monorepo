import { Descriptions, Tag, Space, Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';
import { Partner } from '../../../types/partner';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import { renderCompetenceTag } from '../../../components/ui/renderTag';
import { getEntityById } from '../../../helpers/getEntityById';
import styles from './PartnerMainInfo.module.scss';

const { Text } = Typography;

interface PartnersMainInfoProps {
  partner?: Partner;
}

export default function PartnersMainInfo({ partner }: PartnersMainInfoProps) {
  const { data: referenceBooks } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies', 'partnerEconomicCategories']);

  return (
    <Space direction='vertical' size='middle' className={styles.container}>
      {/* Основные реквизиты организации */}
      <Descriptions
        title='Основные реквизиты организации'
        column={1}
        bordered
        size='middle'
        className={styles.descriptions}
      >
        <Descriptions.Item label='Полное наименование'>
          {partner?.name || <Text type='secondary'>Не указано</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Краткое наименование'>
          {partner?.short_name || <Text type='secondary'>Не указано</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Статус'>
          {partner?.status_id ? (
            <Tag color='green'>{getNameById(partner.status_id, referenceBooks?.partnerStatuses)}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Экономическая группа'>
          {partner?.partner_economic_category_id ? (
            <Tag color='cyan'>{getNameById(partner.partner_economic_category_id, referenceBooks?.partnerEconomicCategories)}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Комментарий'>
          {partner?.comment || <Text type='secondary'>Нет комментария</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Типы'>
          {partner?.type_ids && partner.type_ids.length > 0 ? (
            <Space wrap>
              {partner.type_ids.map(typeId => (
                <Tag key={typeId} color='blue'>
                  {getNameById(typeId, referenceBooks?.partnerTypes)}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type='secondary'>Типы не указаны</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Компетенции'>
          {partner?.competence_ids && partner.competence_ids.length > 0 ? (
            <Space wrap>
              {partner.competence_ids.map(competenceId => renderCompetenceTag(getEntityById(competenceId, referenceBooks?.competencies)))}
            </Space>
          ) : (
            <Text type='secondary'>Компетенции не указаны</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Адреса */}
      <Descriptions
        title='Адреса'
        column={1}
        bordered
        size='middle'
        className={styles.descriptions}
      >
        <Descriptions.Item label='Юридический адрес'>
          {partner?.legal_address || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Фактический адрес'>
          {partner?.actual_address || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>
      </Descriptions>

      {/* Контактная информация */}
      <Descriptions
        title='Контактная информация'
        column={1}
        bordered
        size='middle'
        className={styles.descriptions}
      >
        <Descriptions.Item label='Телефон'>
          {partner?.phone || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='E-mail'>
          {partner?.email || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Сайт'>
          {partner?.website ? (
            <a href={partner.website} target='_blank' rel='noopener noreferrer'>
              {partner.website}
            </a>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Реквизиты */}
      <Descriptions
        title='Реквизиты'
        column={1}
        bordered
        size='middle'
        className={styles.descriptions}
      >
        <Descriptions.Item label='ИНН'>{partner?.inn || <Text type='secondary'>Не указан</Text>}</Descriptions.Item>

        <Descriptions.Item label='КПП'>{partner?.kpp || <Text type='secondary'>Не указан</Text>}</Descriptions.Item>

        <Descriptions.Item label='ОГРН'>{partner?.ogrn || <Text type='secondary'>Не указан</Text>}</Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

export function PartnerMainInfoTab() {
  const partner = useOutletContext<Partner>();
  return <PartnersMainInfo partner={partner} />;
}
