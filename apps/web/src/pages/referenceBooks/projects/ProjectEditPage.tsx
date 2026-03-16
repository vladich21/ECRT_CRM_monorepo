import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Select, DatePicker, Row, Col, Divider } from 'antd';
import {
  SaveOutlined,
  ProjectOutlined,
  BarcodeOutlined,
  CalendarOutlined,
  UserOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import dayjs from 'dayjs';
import { projectUpdateFormMapper } from '../../../helpers/mappers/projectUpdateFormMapper';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useProjectById, useUpdateProject } from '../../../api/projects/projectApiHooks';
import styles from './ProjectFormPage.module.scss';

const { Option } = Select;
const { TextArea } = Input;

export default function ProjectEditPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useProjectById(projectId!);
  const { mutate, isPending: isUpdateLoading, isError: isUpdateError, isSuccess: isUpdateSuccess } = useUpdateProject();

  const { data: referenceBooks, isLoading, isError } = useReferenceData(['users']);

  useEffect(() => {
    if (project) {
      const formData = projectUpdateFormMapper(project);
      form.setFieldsValue({
        ...formData,
        start_date: formData.start_date ? dayjs(formData.start_date) : null,
        end_date: formData.end_date ? dayjs(formData.end_date) : null,
      });
    }
  }, [project, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Проект успешно изменён');
      setTimeout(() => navigate(-1), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить проект');
    }
  }, [isUpdateError, isUpdateSuccess]);

  if (isLoading || isProjectLoading) {
    return <Loader />;
  }

  if (isError || isProjectError || !project || !referenceBooks) {
    return <NotFound errorMessage='Не найден проект или справочник' />;
  }

  const handleSave = async (values: any) => {
    const payload = getChangedFields(values, projectUpdateFormMapper(project));

    if (payload.start_date && dayjs.isDayjs(payload.start_date)) {
      payload.start_date = payload.start_date.format('YYYY-MM-DD');
    }
    if (payload.end_date && dayjs.isDayjs(payload.end_date)) {
      payload.end_date = payload.end_date.format('YYYY-MM-DD');
    }

    mutate({ id: projectId!, data: payload });
  };

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title={`Редактирование проекта: ${project.name}`} subtitle="Внесите изменения в данные проекта" />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleSave}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          {/* Идентификация проекта */}
          <Divider orientation='left'>
            <ProjectOutlined /> Идентификация проекта
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label='Код проекта' name='code' rules={[{ required: true, message: 'Введите код проекта' }]}>
                <Input type='number' placeholder='Код' prefix={<BarcodeOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={9}>
              <Form.Item
                label='Название'
                name='name'
                rules={[{ required: true, message: 'Введите название проекта' }]}
              >
                <Input placeholder='Введите название проекта' />
              </Form.Item>
            </Col>

            <Col xs={24} md={9}>
              <Form.Item
                label='Короткое название'
                name='short_name'
                rules={[{ required: true, message: 'Введите короткое название' }]}
              >
                <Input placeholder='Введите короткое название' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Описание' name='description'>
                <TextArea rows={4} placeholder='Введите описание проекта' showCount maxLength={500} />
              </Form.Item>
            </Col>
          </Row>

          {/* Сроки и статус */}
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
              <Form.Item label='Дата окончания' name='end_date'>
                <DatePicker style={{ width: '100%' }} placeholder='Выберите дату окончания' format='DD.MM.YYYY' />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label='Статус'
                name='status'
                rules={[{ required: true, message: 'Выберите статус проекта' }]}
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

          {/* Управление */}
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
          </Row>

          {/* Кнопки действий */}
          <div className={styles.formActions}>
            <Button onClick={() => navigate(-1)}>
              Отмена
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              icon={<SaveOutlined />}
              disabled={!isFormChanged}
              loading={isUpdateLoading}
            >
              Сохранить изменения
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
