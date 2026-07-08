import {
  BarcodeOutlined,
  CalendarOutlined,
  EditOutlined,
  ProjectOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import { useCreateProject } from '@/api/projects/projectApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
import { initialFormValues } from './data';
import styles from './ProjectFormPage.module.scss';

const { TextArea } = Input;
export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const { mutate, isPending: isCreateLoading } = useCreateProject();
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['users']);
  const handleCreate = async (values: any) => {
    const start_date = values.start_date ? values.start_date.format('YYYY-MM-DD') : '';
    const end_date = values.end_date ? values.end_date.format('YYYY-MM-DD') : '';
    mutate(
      {
        code: values.code != null ? String(values.code) : '',
        name: values.name ?? '',
        short_name: values.short_name ?? '',
        description: values.description ?? undefined,
        start_date,
        end_date: end_date || undefined,
        manager_id: values.manager_id ?? undefined,
        purchaser_id: values.purchaser_id ?? undefined,
        status: values.status ?? 'active',
      } as Parameters<typeof mutate>[0],
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Проект успешно создан');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось создать проект');
        },
      },
    );
  };
  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title='Создание нового проекта' subtitle='Заполните данные проекта' />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          initialValues={initialFormValues}
          onFinish={handleCreate}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <Divider orientation='left'>
            <ProjectOutlined /> Идентификация проекта
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item
                label='Код проекта'
                name='code'
                rules={[
                  { required: true, message: 'Введите код проекта' },
                  { pattern: /^\d+$/, message: 'Код должен состоять только из цифр' },
                ]}
              >
                <Input type='number' placeholder='Код' prefix={<BarcodeOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={9}>
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

            <Col xs={24} md={9}>
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

          <Divider orientation='left'>
            <CalendarOutlined /> Сроки и статус
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label='Дата начала'
                name='start_date'
                rules={[{ required: true, message: 'Выберите дату начала' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder='Выберите дату начала' format='DD.MM.YYYY' />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
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

            <Col xs={24} md={8}>
              <Form.Item
                label='Статус'
                name='status'
                rules={[{ required: true, message: 'Выберите статус проекта' }]}
                initialValue='active'
              >
                <Select placeholder='Выберите статус' suffixIcon={<EditOutlined />}>
                  <Select.Option value='active'>Активный</Select.Option>
                  <Select.Option value='pending'>В ожидании</Select.Option>
                  <Select.Option value='paused'>Приостановлен</Select.Option>
                  <Select.Option value='completed'>Завершен</Select.Option>
                  <Select.Option value='cancelled'>Отменен</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation='left'>
            <UserOutlined /> Управление
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
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  suffixIcon={<UserOutlined />}
                >
                  {referenceBooks?.users?.map(user => (
                    <Select.Option key={user.id} value={user.id} label={user.name}>
                      {user.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label='Ответственный закупщик' name='purchaser_id'>
                <Select
                  placeholder='Выберите закупщика'
                  allowClear
                  showSearch
                  optionFilterProp='label'
                  optionLabelProp='label'
                  filterOption={(input, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  suffixIcon={<UserOutlined />}
                >
                  {referenceBooks?.users?.map(user => (
                    <Select.Option key={user.id} value={user.id} label={user.name}>
                      {user.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className={styles.formActions}>
            <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
              Очистить форму
            </Button>
            <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
              Создать проект
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
