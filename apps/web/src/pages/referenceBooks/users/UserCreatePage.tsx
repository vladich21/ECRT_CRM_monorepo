import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UserAddOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useCreateUser } from '../../../api/users/userApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { initialFormValues } from './data';
import { DevelopmentBadge } from '../../../components/inDevelopment/InDevelopment';
import { TextWithDevTooltip } from '../../../components/inDevelopment/Tooltip';

const { Option } = Select;

export default function UserCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'positions', 'roles']);

  const { mutate, isPending: isCreateLoading, isError: isCreateError, isSuccess: isCreateSuccess } = useCreateUser();

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Пользователь успешно создан');
      setTimeout(() => navigate('/users'), 1000);
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать пользователя');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification]);

  const handleCreate = async (values: Record<string, unknown>) => {
    const toUuidOrNull = (v: unknown) => (v != null && v !== '' ? String(v) : null);
    const roleIds = (values.role_ids ?? values.roles ?? []) as (string | number)[];
    const payload = {
      ...values,
      department_id: toUuidOrNull(values.department_id),
      position_id: toUuidOrNull(values.position_id),
      workplace_id: undefined,
      role_ids: Array.isArray(roleIds) ? roleIds.map(String).filter(id => id && id !== '') : [],
      roles: undefined,
    };
    delete (payload as Record<string, unknown>).roles;
    mutate(payload as any);
  };

  if (isReferencesLoading) {
    return <Loader />;
  }

  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton />

        <Card
          title={
            <span>
              <UserAddOutlined style={{ marginRight: 8 }} />
              Создание нового пользователя
            </span>
          }
        >
          <Form
            form={form}
            layout='vertical'
            initialValues={initialFormValues}
            onFinish={handleCreate}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            scrollToFirstError
          >
            {/* Основная информация */}
            <Divider orientation='left'>
              <UserOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Имя' name='first_name' rules={[{ required: true, message: 'Введите имя' }]}>
                  <Input placeholder='Введите имя' />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Логин' name='login' rules={[{ required: true, message: 'Введите логин' }]}>
                  <Input placeholder='Введите логин' />
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
                <Form.Item label='Роли' name='roles'>
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
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать пользователя
                </Button>
                <Button onClick={() => form.resetFields()} size='large' disabled={isCreateLoading}>
                  Очистить форму
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
