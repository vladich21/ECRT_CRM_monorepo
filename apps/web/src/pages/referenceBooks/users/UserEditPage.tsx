import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Switch, Space, Row, Col, Divider } from 'antd';
import {
  SaveOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  IdcardOutlined,
  DesktopOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useUpdateUser, useUserById } from '../../../api/users/userApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { userUpdateFormMapper } from '../../../helpers/mappers/userUpdateFormMapper';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import { TextWithDevTooltip } from '../../../components/inDevelopment/Tooltip';
import { DevelopmentBadge } from '../../../components/inDevelopment/InDevelopment';

const { Option } = Select;

export default function UserEditPage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useUserById(userId!);
  const { data: referenceBooks, isLoading, isError } = useReferenceData(['departments', 'positions', 'roles']);
  const { mutate, isPending: isUpdateLoading, isError: isUpdateError, isSuccess: isUpdateSuccess } = useUpdateUser();

  useEffect(() => {
    if (user) form.setFieldsValue(userUpdateFormMapper(user));
  }, [user]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Пользователь успешно изменён');
      setTimeout(() => navigate('/users'), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить пользователя');
    }
  }, [isUpdateError, isUpdateSuccess]);

  if (isLoading || isUserLoading) {
    return <Loader />;
  }

  if (isError || isUserError || !user || !referenceBooks) {
    return <NotFound errorMessage='Не найден пользователь или справочник' />;
  }

  const handleSave = async (values: Record<string, unknown>) => {
    const payload = getChangedFields(values, userUpdateFormMapper(user)) as Record<string, unknown>;
    const toUuidOrNull = (v: unknown) => (v != null && v !== '' ? String(v) : null);
    if ('department_id' in payload) payload.department_id = toUuidOrNull(payload.department_id);
    if ('position_id' in payload) payload.position_id = toUuidOrNull(payload.position_id);
    if ('workplace_id' in payload) payload.workplace_id = toUuidOrNull(payload.workplace_id);
    if ('role_ids' in payload && Array.isArray(payload.role_ids))
      payload.role_ids = payload.role_ids.map(String).filter(id => id && id !== '');
    mutate({ id: userId!, data: payload });
  };

  const handleBack = () => navigate(-1);

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton />
        <Card
          title={
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              Редактирование пользователя: {user.last_name} {user.first_name}
            </span>
          }
        >
          <Form
            form={form}
            layout='vertical'
            onFieldsChange={() => setIsFormChanged(true)}
            onFinish={handleSave}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            scrollToFirstError
          >
            <Divider orientation='left'>
              <UserOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Имя' name='first_name' rules={[{ required: true, message: 'Введите имя' }]}>
                  <Input placeholder='Введите имя' />
                </Form.Item>
              </Col>

            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Фамилия' name='last_name' rules={[{ required: true, message: 'Введите фамилию' }]}>
                  <Input placeholder='Введите фамилию' />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Отчество' name='middle_name'>
                  <Input placeholder='Введите отчество' />
                </Form.Item>
              </Col>
            </Row>

            {/* Контактная информация */}
            <Divider orientation='left'>
              <MailOutlined /> Контактная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Почта'
                  name='email'
                  rules={[
                    { required: true, message: 'Введите email' },
                    { type: 'email', message: 'Введите корректный email' },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder='email@example.com' type='email' />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label='Моб. телефон'
                  name='phone'
                  rules={[
                    {
                      pattern: /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
                      message: 'Введите корректный номер телефона (например: +7 (999) 999-99-99)',
                    },
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder='+7 (999) 999-99-99' />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label={<TextWithDevTooltip text='Внутренний номер' />}
                  name='internal_phone'
                  rules={[{ pattern: /^\d{3,8}$/, message: 'Введите от 3 до 8 цифр' }]}
                >
                  <Input disabled placeholder='nnn' maxLength={8} />
                </Form.Item>
              </Col>
            </Row>

            {/* Организационная информация */}
            <Divider orientation='left'>
              <TeamOutlined /> Организационная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label='Отдел' name='department_id'>
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите отдел'
                    allowClear
                    suffixIcon={<TeamOutlined />}
                  >
                    {referenceBooks?.departments?.map(dept => (
                      <Option key={dept.id} value={dept.id}>
                        {dept.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Должность' name='position_id'>
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите должность'
                    allowClear
                    suffixIcon={<IdcardOutlined />}
                  >
                    {referenceBooks?.positions?.map(position => (
                      <Option key={position.id} value={position.id}>
                        {position.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label={<TextWithDevTooltip text='Рабочее место' />} name='workplace_id'>
                  <Select placeholder='Выберите номер места' allowClear disabled suffixIcon={<DesktopOutlined />}>
                    {/* todo: Доработать выбор рабочих мест */}
                    {referenceBooks?.positions?.map(position => (
                      <Option key={position.id} value={position.id}>
                        {position.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

            </Row>

            {/* Права доступа */}
            <Divider orientation='left'>
              <SafetyCertificateOutlined /> Права доступа
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Роли' name='role_ids'>
                  <Select
                    mode='multiple'
                    placeholder='Выберите роли'
                    allowClear
                    suffixIcon={<SafetyCertificateOutlined />}
                  >
                    {referenceBooks?.roles?.map(role => (
                      <Option key={role.id} value={role.id}>
                        {role.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Статус аккаунта' name='is_active' valuePropName='checked' initialValue={true}>
                  <Switch checkedChildren='Активен' unCheckedChildren='Не активен' defaultChecked />
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Form.Item>
              <Space>
                <Button
                  type='primary'
                  htmlType='submit'
                  icon={<SaveOutlined />}
                  disabled={!isFormChanged}
                  loading={isUpdateLoading}
                  size='large'
                >
                  Сохранить изменения
                </Button>

                <Button onClick={handleBack} size='large'>
                  Отмена
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
