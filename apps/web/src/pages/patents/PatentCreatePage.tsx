import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Space, Row, Col, Divider, DatePicker, Tag, Typography } from 'antd';
import {
  SaveOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
  NumberOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  AppstoreOutlined,
  BankOutlined,
  FileDoneOutlined,
  IdcardOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useCreatePatent } from '../../api/patents/patentApiHooks';
import { useNotification } from '../../customhooks/useNotification';
import { BackButton } from '../../components/backButton/BackButton';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { getEntityById } from '../../helpers/getEntityById';
import { SelectWithQuickAdd } from '../../components/selectWithQuickAdd/SelectWithQuickAdd';
import { useMutateByModal } from '../../customhooks/useMutateByModal';
import { PatentArea } from '../../types/patent';
import { useCreatePatentArea } from '../../api/patents/patentAreasApiHooks';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

export default function PatentCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();

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

  const { mutate, isPending: isCreateLoading, isError: isCreateError, isSuccess: isCreateSuccess } = useCreatePatent();

  const addAreaMutation = useCreatePatentArea();

  const { handleOpenModal: openMutateModal, data: addAreaResult } = useMutateByModal<PatentArea, Error>({
    isEdit: false,
    mutation: addAreaMutation,
    successMessage: 'Область патентных заявок успешно добавлена',
    errorMessage: 'Не удалось добавить область патентных заявок',
    modalType: 'patentAreaForm',
    getMutationProps: () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (addAreaResult?.id) {
      try {
        const currentValues: (string | number)[] = form.getFieldValue('area_ids') || [];
        const newId = String(addAreaResult.id);
        if (!newId || newId === 'NaN') return;
        const currentStr = currentValues.map((v) => String(v)).filter((v) => v && v !== 'NaN');
        if (!currentStr.includes(newId)) {
          form.setFieldValue('area_ids', [...currentStr, newId]);
        }
      } catch {}
    }
  }, [addAreaResult, form]);

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Патент успешно создан');
      setTimeout(() => navigate(-1), 1000);
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать патент');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification]);

  const handleCreate = async (values: any) => {
    const areaIds = values.area_ids
      ? values.area_ids
          .map((id: unknown) => (id != null ? String(id) : ''))
          .filter((id: string) => id && id !== 'NaN')
      : [];
    const authorIds = values.author_ids ? values.author_ids.filter((id: any) => id !== null && id !== undefined) : [];

    const payload = {
      ...values,
      registration_date: values.registration_date
        ? values.registration_date.format('YYYY-MM-DD')
        : null,
      registration_date_cir: values.registration_date_cir
        ? values.registration_date_cir.format('YYYY-MM-DD')
        : null,
      department_id: values.department_id || null,
      contract_id: values.contract_id || null,
      project_id: values.project_id || null,
      status_id: values.status_id || null,
      area_ids: areaIds,
      author_ids: authorIds,
    };

    delete payload['contract_cipher'];
    delete payload['project_code'];

    mutate(payload);
  };

  const handleContractChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('contract_id', value);
      form.setFieldValue('contract_cipher', getEntityById(value, referenceBooks?.contracts)?.cipher);
    } else {
      form.setFieldValue('contract_cipher', '');
    }
  };

  const handleProjectChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('project_id', value);
      form.setFieldValue('project_code', getEntityById(value, referenceBooks?.projects)?.code);
    } else {
      form.setFieldValue('project_code', '');
    }
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
            <Space>
              <PlusOutlined />
              <Text strong>Создание нового РИД</Text>
            </Space>
          }
        >
          <Form form={form} layout='vertical' onFinish={handleCreate} scrollToFirstError>
            {/* 1. Общая информация о РИД */}
            <Divider orientation='left'>
              <FileTextOutlined /> Общая информация о РИД
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Наименование РИД'
                  name='name'
                  rules={[{ required: true, message: 'Введите наименование РИД' }]}
                >
                  <TextArea
                    placeholder='Введите наименование объекта интеллектуальной собственности'
                    rows={3}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Область применения' name='area_ids'>
                  <SelectWithQuickAdd
                    references={referenceBooks?.patentAreas || []}
                    addText='Добавить'
                    placeholder='Выберите область применения'
                    handleOpenModal={openMutateModal}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Объект собственности'
                  name='intellectprop_id'
                  rules={[{ required: true, message: 'Выберите объект собственности' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите объект интеллектуальной собственности'
                  >
                    {referenceBooks?.patentIntellectProps?.map(prop => (
                      <Option key={prop.id} value={prop.id}>
                        {prop.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Статус' name='status_id' rules={[{ required: true, message: 'Выберите состояние' }]}>
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите состояние патента'
                  >
                    {referenceBooks?.patentStatuses?.map(status => (
                      <Option key={status.id} value={status.id}>
                        {status.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* 2. Регистрационные данные АО "ИЦ ЖТ" */}
            <Divider orientation='left'>
              <BankOutlined /> Регистрационные данные АО "ИЦ ЖТ"
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Номер регистрации АО "ИЦ ЖТ"'
                  name='registration_number'
                  rules={[{ required: true, message: 'Введите номер регистрации' }]}
                >
                  <Input placeholder='Введите внутренний номер регистрации' prefix={<NumberOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label='Дата регистрации АО "ИЦ ЖТ"'
                  name='registration_date'
                  rules={[{ required: true, message: 'Выберите дату регистрации' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder='Выберите дату'
                    format='DD.MM.YYYY'
                    suffixIcon={<CalendarOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 3. Регистрационные данные ЦИР */}
            <Divider orientation='left'>
              <IdcardOutlined /> Регистрационные данные ЦИР
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Номер регистрации (ЦИР)' name='registration_number_cir'>
                  <Input placeholder='Введите номер регистрации в ЦИР' />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Дата регистрации (ЦИР)' name='registration_date_cir'>
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder='Выберите дату'
                    format='DD.MM.YYYY'
                    suffixIcon={<CalendarOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label='Номер патентной заявки' name='application_number'>
                  <Input placeholder='Введите номер патентной заявки' />
                </Form.Item>
              </Col>
            </Row>

            {/* 4. Организационная принадлежность */}
            <Divider orientation='left'>
              <TeamOutlined /> Организационная принадлежность
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Отдел' name='department_id' rules={[{ required: true, message: 'Выберите отдел' }]}>
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите отдел'
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

              <Col xs={24} md={12}>
                <Form.Item label='Авторы (Исполнители)' name='author_ids'>
                  <Select
                    mode='multiple'
                    showSearch
                    optionFilterProp='label'
                    optionLabelProp='label'
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    placeholder='Выберите исполнителей'
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

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Проект' name='project_id'>
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите проект'
                    allowClear
                    onChange={handleProjectChange}
                    suffixIcon={<ProjectOutlined />}
                  >
                    {referenceBooks?.projects?.map(project => (
                      <Option key={project.id} value={project.id}>
                        {project.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Номер проекта' name='project_code'>
                  <Input placeholder='-' style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
            </Row>

            {/* 5. Документация */}
            <Divider orientation='left'>
              <FileDoneOutlined /> Документация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Номер КД' name='kd_number'>
                  <Input placeholder='Введите номер конструкторской документации' />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Договор (доходный)' name='contract_id'>
                  <Select
                    showSearch
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    placeholder='Выберите договор'
                    allowClear
                    onChange={handleContractChange}
                    suffixIcon={<FileDoneOutlined />}
                  >
                    {referenceBooks?.contracts?.map(contract => (
                      <Option key={contract.id} value={contract.id}>
                        {contract.number}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label='Шифр договора' name='contract_cipher'>
                  <Input placeholder='-' style={{ width: '100%' }} disabled />
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Divider />
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать патент
                </Button>
                <Button onClick={() => form.resetFields()} size='large' disabled={isCreateLoading}>
                  Очистить форму
                </Button>
                <Button onClick={() => navigate(-1)} size='large' disabled={isCreateLoading}>
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
