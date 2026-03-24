import { Descriptions, Space, Typography } from 'antd';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { renderCompetenceTag } from '../../../components/ui/renderTag';
import { getEntityById } from '../../../helpers/getEntityById';
import { Partner } from '../../../types/partner';
import styles from './PartnerMainInfo.module.scss';

const { Text } = Typography;
interface PartnersMainInfoProps {
  partner?: Partner;
}
export default function PartnersMainInfo({ partner }: PartnersMainInfoProps) {
  const { data: referenceBooks } = useReferenceData([
    'partnerTypes',
    'partnerStatuses',
    'competencies',
    'partnerEconomicCategories',
  ]);
  return (
    <Space direction='vertical' size='middle' className={styles.container}>
      <Descriptions title='Общая информация' column={1} bordered size='middle' className={styles.descriptions}>
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
    </Space>
  );
}
export { default as PartnerMainInfoTab } from '../registry/PartnerOverviewTab';
