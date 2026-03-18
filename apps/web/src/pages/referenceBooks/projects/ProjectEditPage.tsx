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
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import dayjs from 'dayjs';
import { projectUpdateFormMapper } from '../../../helpers/mappers/projectUpdateFormMapper';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useProjectById, useUpdateProject } from '../../../api/projects/projectApiHooks';
import { PROJECT_STATUS_CONFIG } from './ProjectsListPage.types';
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

  const wCode = Form.useWatch('code', form) as string | number | undefined;
  const wName = Form.useWatch('name', form) as string | undefined;
  const wShortName = Form.useWatch('short_name', form) as string | undefined;
  const wStatus = Form.useWatch('status', form) as string | undefined;

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

  const statusBadge = (() => {
    const s = (wStatus ?? (project as any)?.status) as string | undefined;
    if (!s) return undefined;
    const st = (PROJECT_STATUS_CONFIG as any)[s] ?? PROJECT_STATUS_CONFIG.active;
    return { label: st.label, color: st.color };
  })();

  const headerName = (wName ?? project.name ?? '').trim();
  const headerTitle = headerName || '—';
  const headerCode = (wCode ?? (project as any)?.code) ? String(wCode ?? (project as any)?.code) : '';
  const headerShortRaw = (wShortName ?? (project as any)?.short_name) ? String(wShortName ?? (project as any)?.short_name) : '';
  const headerShort = headerShortRaw && headerShortRaw !== headerTitle ? headerShortRaw : '';

  return (
    <DetailPageHeader
      title={headerTitle}
      backLabel="Проекты"
      onBack={() => navigate('/projects')}
      statusBadge={statusBadge}
      metaItems={[
        headerCode ? <span key="code" className={hStyles.metaText}>Код: {headerCode}</span> : null,
        headerShort ? <span key="short" className={hStyles.metaText}>{headerShort}</span> : null,
      ].filter(Boolean)}
      actions={
        <>
          <Button onClick={() => navigate(-1)}>Отмена</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!isFormChanged}
            loading={isUpdateLoading}
            onClick={() => form.submit()}
          >
            Сохранить
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Редактирование' }]}
      activeTab="main"
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
    >
      <div className={styles.formCard}>
        <Form
          form={form}
          layout="vertical"
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleSave}
          onKeyPress={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <Divider orientation='left'>
            <ProjectOutlined /> Идентификация проекта
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label='Код проекта' name='code' rules={[{ required: true, message: 'Введите код проекта' }]}>
                <Input type='number' placeholder='Код' prefix={<BarcodeOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={13}>
              <Form.Item
                label='Название'
                name='name'
                rules={[{ required: true, message: 'Введите название проекта' }]}
              >
                <Input placeholder='Введите название проекта' />
              </Form.Item>
            </Col>

            <Col xs={24} md={5}>
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

          <div className={styles.twoColSections}>
            <div className={styles.sectionBox}>
              <Divider orientation="left" style={{ marginTop: 0 }}>
                <CalendarOutlined /> Сроки и статус
              </Divider>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Дата начала"
                    name="start_date"
                    rules={[{ required: true, message: 'Выберите дату начала' }]}
                  >
                    <DatePicker style={{ width: '100%' }} placeholder="Выберите дату начала" format="DD.MM.YYYY" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item label="Дата окончания" name="end_date">
                    <DatePicker style={{ width: '100%' }} placeholder="Выберите дату окончания" format="DD.MM.YYYY" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="Статус"
                    name="status"
                    rules={[{ required: true, message: 'Выберите статус проекта' }]}
                  >
                    <Select placeholder="Выберите статус" suffixIcon={<EditOutlined />}>
                      <Option value="active">Активный</Option>
                      <Option value="pending">В ожидании</Option>
                      <Option value="paused">Приостановлен</Option>
                      <Option value="completed">Завершен</Option>
                      <Option value="cancelled">Отменен</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.sectionBox}>
              <Divider orientation="left" style={{ marginTop: 0 }}>
                <UserOutlined /> Управление
              </Divider>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label="Руководитель" name="manager_id">
                    <Select
                      placeholder="Выберите руководителя"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      optionLabelProp="label"
                      filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      suffixIcon={<UserOutlined />}
                    >
                      {referenceBooks?.users?.map((user) => (
                        <Option key={user.id} value={user.id} label={user.name}>
                          {user.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </div>
        </Form>
      </div>
    </DetailPageHeader>
  );
}
