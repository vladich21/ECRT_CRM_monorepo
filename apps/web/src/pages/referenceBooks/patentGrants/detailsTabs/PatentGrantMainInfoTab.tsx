import { Descriptions, Space, Tag, Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';

import { useReferenceData } from '../../../../api/hooks/useReferences';
import { Loader } from '../../../../components/loader/Loader';
import { NotFound } from '../../../../components/notFound/NotFound';
import { getNameById } from '../../../../helpers/getNameById';
import { PatentGrant } from '../../../../types/patent';
import { patentGrantStatusTagPreset } from '../patentGrantStatusStyles';
import styles from './PatentGrantMainInfoTab.module.scss';

const { Text } = Typography;

interface PatentGrantMainInfoProps {
  patentGrant?: PatentGrant;
}

function PatentGrantMainInfo({ patentGrant }: PatentGrantMainInfoProps) {
  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(['patents']);

  if (isReferencesLoading) {
    return <Loader />;
  }

  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Справочники не найдены' />;
  }

  const formatDate = (iso?: string) =>
    iso?.trim()
      ? new Date(iso).toLocaleDateString('ru-RU')
      : <Text type='secondary'>Не указана</Text>;

  return (
    <Space direction='vertical' size='middle' className={styles.container}>
      <Descriptions title='Основная информация' column={1} bordered size='middle' className={styles.descriptions}>
        <Descriptions.Item label='Номер охранного документа'>
          {patentGrant?.grant_number || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='РИД'>
          {patentGrant?.patent_id ? (
            <Tag color='blue' style={{ fontSize: 12 }}>
              {getNameById(patentGrant.patent_id, referenceBooks.patents)}
            </Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title='Статус и даты' column={1} bordered size='middle' className={styles.descriptions}>
        <Descriptions.Item label='Статус'>
          {patentGrant?.status ? (
            <Tag color={patentGrantStatusTagPreset(patentGrant.status)} style={{ fontSize: 12 }}>
              {patentGrant.status}
            </Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label='Дата выдачи'> {formatDate(patentGrant?.grant_date)}</Descriptions.Item>
        <Descriptions.Item label='Дата продления'>{formatDate(patentGrant?.renewal_date)}</Descriptions.Item>
        <Descriptions.Item label='Ведомство'>
          {patentGrant?.office?.trim() ? patentGrant.office : <Text type='secondary'>Не указано</Text>}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title='Дополнительная информация' column={1} bordered size='middle' className={styles.descriptions}>
        <Descriptions.Item label='Примечания'>
          {patentGrant?.notes?.trim() ? patentGrant.notes : <Text type='secondary'>Нет</Text>}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

export function PatentGrantMainInfoTab() {
  const patentGrant = useOutletContext<PatentGrant>();
  return <PatentGrantMainInfo patentGrant={patentGrant} />;
}
