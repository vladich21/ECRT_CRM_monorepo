import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Space } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useUserById } from '../../../api/users/userApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { BackButton } from '../../../components/backButton/BackButton';
import { useNotification } from '../../../customhooks/useNotification';

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const navigate = useNavigate();
  const { contextHolder } = useNotification();
  const { data: user, isLoading, isError } = useUserById(userId!);

  const handleEdit = () => navigate(`/users/${userId}/edit`);

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !user) {
    return <NotFound errorMessage='Пользователь не найден' />;
  }

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton />
        <Card
          title={`${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim()}
          extra={
            <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
              Редактировать
            </Button>
          }
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label='Статус'>
              {user.is_active ? <Tag color='green'>Активен</Tag> : <Tag color='red'>Не активен</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Фамилия'>
              {user.last_name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Имя'>{user.first_name || <Tag color='gray'>Не указано</Tag>}</Descriptions.Item>

            <Descriptions.Item label='Email'>{user.email || <Tag color='gray'>Не указано</Tag>}</Descriptions.Item>

            <Descriptions.Item label='Телефон'>{user.phone || <Tag color='gray'>Не указано</Tag>}</Descriptions.Item>

            <Descriptions.Item label='Отдел'>
              {user.department?.name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Должность'>
              {user.position?.name || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Роли'>
              <Space size={[0, 8]} wrap>
                {user.roles?.length > 0 ? (
                  user.roles.map(role => (
                    <Tag key={role.id}>
                      {role.role_name}
                    </Tag>
                  ))
                ) : (
                  <Tag color='orange'>Роли не назначены</Tag>
                )}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  );
}
