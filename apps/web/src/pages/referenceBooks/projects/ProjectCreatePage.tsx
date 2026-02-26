import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Select, DatePicker, Space, Row, Col, Divider } from 'antd';
import {
  SaveOutlined,
  ProjectOutlined,
  BarcodeOutlined,
  CalendarOutlined,
  UserOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { initialFormValues } from './data';
import dayjs from 'dayjs';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { useCreateProject } from '../../../api/projects/projectApiHooks';

const { Option } = Select;
const { TextArea } = Input;

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();

  const { mutate, isPending: isCreateLoading, isError: isCreateError, isSuccess: isCreateSuccess } = useCreateProject();

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['users']);

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Проект успешно создан');
      setTimeout(() => navigate(-1), 1000);
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать проект');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification]);

  const handleCreate = async (values: any) => {
    const payload = {
      ...values,
      manager_id: values.manager_id,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : '',
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : '',
    };

    mutate(payload);
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
              <PlusOutlined style={{ marginRight: 8 }} />
              Создание нового проекта
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
              <ProjectOutlined /> Основная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Код проекта'
                  name='code'
                  rules={[
                    { required: true, message: 'Введите код проекта' },
                    { pattern: /^\d+$/, message: 'Код должен состоять только из цифр' },
                  ]}
                >
                  <Input type='number' placeholder='Введите код проекта' prefix={<BarcodeOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label='Название'
                  name='name'
                  rules={[
                    { required: true, message: 'Введите название проекта' },
                    { min: 2, message: 'Название должно содержать минимум 2 символа' },
                  ]}
                >
                  <Input placeholder='Введите название проекта' />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label='Короткое название'
                  name='short_name'
                  rules={[
                    { required: true, message: 'Введите короткое название' },
                    { min: 2, message: 'Короткое название должно содержать минимум 2 символа' },
                  ]}
                >
                  <Input placeholder='Введите короткое название' />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  label='Описание'
                  name='description'
                  rules={[{ max: 500, message: 'Описание не должно превышать 500 символов' }]}
                >
                  <TextArea rows={4} placeholder='Введите описание проекта' showCount maxLength={500} />
                </Form.Item>
              </Col>
            </Row>

            {/* Даты проекта */}
            <Divider orientation='left'>
              <CalendarOutlined /> Даты проекта
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Дата начала'
                  name='start_date'
                  rules={[{ required: true, message: 'Выберите дату начала' }]}
                >
                  <DatePicker style={{ width: '100%' }} placeholder='Выберите дату начала' format='DD.MM.YYYY' />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label='Дата окончания'
                  name='end_date'
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || !getFieldValue('start_date')) {
                          return Promise.resolve();
                        }
                        if (value.isBefore(getFieldValue('start_date'))) {
                          return Promise.reject(new Error('Дата окончания не может быть раньше даты начала'));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder='Выберите дату окончания'
                    format='DD.MM.YYYY'
                    disabledDate={current => {
                      const startDate = form.getFieldValue('start_date');
                      return startDate ? current && current < startDate : false;
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Управление проектом */}
            <Divider orientation='left'>
              <UserOutlined /> Управление проектом
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Руководитель' name='manager_id'>
                  <Select
                    placeholder='Выберите руководителя'
                    allowClear
                    showSearch
                    optionFilterProp='label'
                    optionLabelProp='label'
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    suffixIcon={<UserOutlined />}
                  >
                    {referenceBooks?.users?.map(user => (
                      <Option key={user.id} value={user.id} label={user.name}>
                        {user.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label='Статус'
                  name='status'
                  rules={[{ required: true, message: 'Выберите статус проекта' }]}
                  initialValue='active'
                >
                  <Select placeholder='Выберите статус' suffixIcon={<EditOutlined />}>
                    <Option value='active'>Активный</Option>
                    <Option value='pending'>В ожидании</Option>
                    <Option value='paused'>Приостановлен</Option>
                    <Option value='completed'>Завершен</Option>
                    <Option value='cancelled'>Отменен</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать проект
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
