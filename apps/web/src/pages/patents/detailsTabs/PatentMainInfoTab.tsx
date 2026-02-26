import { Descriptions, Tag, Space, Typography } from 'antd';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import { Patent } from '../../../types/patent';
import { useOutletContext } from 'react-router-dom';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNamesByIds } from '../../../components/getNamesByIds';

const { Text } = Typography;

export default function PatentMainInfo({ patent }: { patent: Patent }) {
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'patentIntellectProps',
    'patentStatuses',
    'patentAreas',
  ]);

  if (isReferencesLoading) {
    return <Loader />;
  }

  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Патент не найден или не подгрузились справочники' />;
  }

  const formatDate = (dateString: string) => {
    return dateString ? new Date(dateString).toLocaleDateString('ru-RU') : '-';
  };

  return (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      {/* Общая информация о РИД */}
      <Descriptions
        title='Общая информация о РИД'
        column={1}
        bordered
        size='middle'
        labelStyle={{
          maxWidth: '250px',
          width: '250px',
          fontWeight: '600',
        }}
      >
        <Descriptions.Item label='Наименование РИД'>
          {patent.name || <Text type='secondary'>Не указано</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Объект собственности'>
          {patent.intellectprop_id ? (
            <Tag color='green'>{getNameById(patent.intellectprop_id, referenceBooks?.patentIntellectProps)}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Статус'>
          {patent.status_id ? (
            <Tag color='volcano'>{getNameById(patent.status_id, referenceBooks?.patentStatuses)}</Tag>
          ) : (
            <Text type='secondary'>Не указано</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Область применения'>
          {getNamesByIds(patent.area_ids, referenceBooks?.patentAreas)}
        </Descriptions.Item>
      </Descriptions>

      {/* Регистрационные данные АО "ИЦ ЖТ" */}
      <Descriptions
        title='Регистрационные данные АО "ИЦ ЖТ"'
        column={1}
        bordered
        size='middle'
        labelStyle={{
          maxWidth: '250px',
          width: '250px',
          fontWeight: '600',
        }}
      >
        <Descriptions.Item label='Номер регистрации'>
          {patent.registration_number || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Дата регистрации'>{formatDate(patent.registration_date)}</Descriptions.Item>
      </Descriptions>

      {/* Регистрационные данные ЦИР */}
      <Descriptions
        title='Регистрационные данные ЦИР'
        column={1}
        bordered
        size='middle'
        labelStyle={{
          maxWidth: '250px',
          width: '250px',
          fontWeight: '600',
        }}
      >
        <Descriptions.Item label='Номер регистрации (ЦИР)'>
          {patent.registration_number_cir || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Дата регистрации (ЦИР)'>{formatDate(patent.registration_date_cir)}</Descriptions.Item>

        <Descriptions.Item label='Номер патентной заявки'>
          {patent.application_number || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>
      </Descriptions>

      {/* Организационная принадлежность */}
      <Descriptions
        title='Организационная принадлежность'
        column={1}
        bordered
        size='middle'
        labelStyle={{
          maxWidth: '250px',
          width: '250px',
          fontWeight: '600',
        }}
      >
        <Descriptions.Item label='Отдел'>
          {patent.department_id ? (
            <Tag color='purple'>{getNameById(patent.department_id, referenceBooks?.departments)}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Авторы (Исполнители)'>
          {getNamesByIds(patent.author_ids, referenceBooks?.users)}
        </Descriptions.Item>

        <Descriptions.Item label='Проект'>
          {patent.project_id ? (
            <Tag color='cyan'>{getNameById(patent.project_id, referenceBooks?.projects)}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Номер проекта'>
          {patent.project_id ? (
            <Text>{getEntityById(patent.project_id, referenceBooks?.projects)?.code}</Text>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Документация и участники */}
      <Descriptions
        title='Документация и участники'
        column={1}
        bordered
        size='middle'
        labelStyle={{
          maxWidth: '250px',
          width: '250px',
          fontWeight: '600',
        }}
      >
        <Descriptions.Item label='Номер КД'>
          {patent.kd_number || <Text type='secondary'>Не указан</Text>}
        </Descriptions.Item>

        <Descriptions.Item label='Договор (доходный)'>
          {patent.contract_id ? (
            <Tag color='orange'>{referenceBooks.contracts?.find(el => el.id === patent.contract_id)?.number}</Tag>
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label='Шифр договора'>
          {patent.contract_id ? (
            referenceBooks.contracts?.find(el => el.id === patent.contract_id)?.cipher || (
              <Text type='secondary'>(не заполнено)</Text>
            )
          ) : (
            <Text type='secondary'>Не указан</Text>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

export function PatentMainInfoTab() {
  const patent = useOutletContext<Patent>();
  return <PatentMainInfo patent={patent} />;
}
