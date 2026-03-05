import { useOutletContext } from 'react-router-dom';
import { Descriptions, Tag, Space, Typography } from 'antd';
import { PatentGrant } from '../../../../types/patent';
import { NotFound } from '../../../../components/notFound/NotFound';
import { Loader } from '../../../../components/loader/Loader';
import { useReferenceData } from '../../../../api/hooks/useReferences';
import { getNameById } from '../../../../helpers/getNameById';
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

  return (
    <Space direction='vertical' size='middle' className={styles.container}>
      {/* Основная информация */}
      <Descriptions
        title='Основная информация'
        column={1}
        bordered
        size='middle'
        className={styles.descriptions}
      >
        <Descriptions.Item label='Номер гранта'>
          {patentGrant?.grant_number || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Патент'>
          {patentGrant?.patent_id ? (
            <Tag color='blue'>{getNameById(patentGrant.patent_id, referenceBooks.patents)}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Статус'>
          {patentGrant?.status ? (
            <Tag color={patentGrant.status === 'Активный' ? 'green' : 'red'}>{patentGrant.status}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Даты */}
      <Descriptions
        title='Даты'
        column={1}
        bordered
        size='middle'
        className={styles.descriptions}
      >
        <Descriptions.Item label='Дата продления'>
          {patentGrant?.renewal_date ? (
            new Date(patentGrant.renewal_date).toLocaleDateString('ru-RU')
          ) : (
            <Text type='secondary'>Не указана</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Дополнительная информация */}
      {patentGrant?.notes && (
        <Descriptions
          title='Дополнительная информация'
          column={1}
          bordered
          size='middle'
          className={styles.descriptions}
        >
          <Descriptions.Item label='Примечания'>
            {patentGrant.notes}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Space>
  );
}

export function PatentGrantMainInfoTab() {
  const patentGrant = useOutletContext<PatentGrant>();
  return <PatentGrantMainInfo patentGrant={patentGrant} />;
}
