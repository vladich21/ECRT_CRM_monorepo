import { useParams } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Space } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useDepartmentById } from '../../../api/departments/departmentsApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { BackButton } from '../../../components/backButton/BackButton';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';

export default function DepartmentDetailsPage() {
  const { departmentId } = useParams();
  const { data: department, isLoading, isError } = useDepartmentById(departmentId!);

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'users']);

  if (isLoading || isReferencesLoading) {
    return <Loader />;
  }

  if (isError || !department || isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Отдел не найден или не подгрузились справочники' />;
  }

  return (
    <div>
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton />

        <Card
          title={department.name}
          extra={
            <Button icon={<TeamOutlined />} onClick={() => {}}>
              Сотрудники
            </Button>
          }
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label='Статус'>
              {department.is_active ? <Tag color='green'>Активен</Tag> : <Tag color='red'>Не активен</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Название'>
              {department.name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Короткое название'>
              {department.short_name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Руководитель'>
              {department.manager_id ? (
                <Tag color='blue'>{getNameById(department.manager_id, referenceBooks?.users)}</Tag>
              ) : (
                <Tag color='gray'>Не назначен</Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label='Родительский отдел'>
              {department.parent_id ? (
                <Tag color='purple'>{getNameById(department.parent_id, referenceBooks?.departments!)} </Tag>
              ) : (
                <Tag color='gray'>Нет</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  );
}
