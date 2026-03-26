import { useEffect } from 'react';
import {
  BankOutlined,
  CalendarOutlined,
  FileTextOutlined,
  NumberOutlined,
  ProjectOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { useCreatePatent } from '../../api/patents/patentApiHooks';
import { useCreatePatentArea } from '../../api/patents/patentAreasApiHooks';
import { BackButton } from '../../components/backButton/BackButton';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { SelectWithQuickAdd } from '../../components/selectWithQuickAdd/SelectWithQuickAdd';
import { useMutateByModal } from '../../customhooks/useMutateByModal';
import { useNotification } from '../../customhooks/useNotification';
import { getEntityById } from '../../helpers/getEntityById';
import { PatentArea } from '../../types/patent';
import styles from './PatentFormPage.module.scss';

const { Option } = Select;
const { TextArea } = Input;
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
        const currentStr = currentValues.map(value => String(value)).filter(value => value && value !== 'NaN');
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
      ? values.area_ids.map((id: unknown) => (id != null ? String(id) : '')).filter((id: string) => id && id !== 'NaN')
      : [];
    const authorIds = values.author_ids ? values.author_ids.filter((id: any) => id !== null && id !== undefined) : [];
    const payload = {
      ...values,
      registration_date: values.registration_date ? values.registration_date.format('YYYY-MM-DD') : null,
      registration_date_cir: values.registration_date_cir ? values.registration_date_cir.format('YYYY-MM-DD') : null,
      department_id: values.department_id || null,
      responsible_for_patenting_id: values.responsible_for_patenting_id || null,
      contract_id: values.contract_id || null,
      project_id: values.project_id || null,
      status_id: values.status_id || null,
      area_ids: areaIds,
      author_ids: authorIds,
    };
    delete payload['project_code'];
    mutate(payload);
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
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title='Создание нового РИД'
        titleWeight='medium'
        subtitle='Заполните данные для создания объекта интеллектуальной собственности'
      />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleCreate}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <div className={styles.formSectionsStack}>
            <div className={styles.sectionBox}>
              <Divider orientation='left'>
                <FileTextOutlined /> Идентификация РИД
              </Divider>

              <Row gutter={16}>
                <Col xs={24}>
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
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={8}>
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
                      placeholder='Выберите объект'
                    >
                      {referenceBooks?.patentIntellectProps?.map(prop => (
                        <Option key={prop.id} value={prop.id}>
                          {prop.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label='Статус'
                    name='status_id'
                    rules={[{ required: true, message: 'Выберите состояние' }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp='children'
                      filterOption={(input, option) =>
                        String(option?.children ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      placeholder='Выберите статус'
                    >
                      {referenceBooks?.patentStatuses?.map(status => (
                        <Option key={status.id} value={status.id}>
                          {status.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item label='Области применения' name='area_ids'>
                    <SelectWithQuickAdd
                      references={referenceBooks?.patentAreas || []}
                      addText='Добавить'
                      placeholder='Выберите области'
                      handleOpenModal={openMutateModal}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.twoColSections}>
              <div className={styles.sectionBox}>
                <Divider orientation='left'>
                  <BankOutlined /> Регистрационные данные
                </Divider>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label='Номер АО "ИЦ ЖТ"'
                      name='registration_number'
                      rules={[{ required: true, message: 'Введите номер регистрации' }]}
                    >
                      <Input placeholder='Внутренний номер' prefix={<NumberOutlined />} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      label='Дата АО "ИЦ ЖТ"'
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

                  <Col xs={24} md={8}>
                    <Form.Item label='Номер заявки' name='application_number'>
                      <Input placeholder='Номер патентной заявки' />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item label='Номер ЦИР' name='registration_number_cir'>
                      <Input placeholder='Номер регистрации в ЦИР' />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label='Дата ЦИР' name='registration_date_cir'>
                      <DatePicker
                        style={{ width: '100%' }}
                        placeholder='Выберите дату'
                        format='DD.MM.YYYY'
                        suffixIcon={<CalendarOutlined />}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item label='Номер КД' name='kd_number'>
                      <Input placeholder='Номер конструкторской документации' />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className={styles.sectionBox}>
                <Divider orientation='left'>
                  <TeamOutlined /> Организация и ответственные
                </Divider>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label='Отдел'
                      name='department_id'
                      rules={[{ required: true, message: 'Выберите отдел' }]}
                    >
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
                    <Form.Item label='Ответственный за патентование' name='responsible_for_patenting_id'>
                      <Select
                        showSearch
                        optionFilterProp='label'
                        optionLabelProp='label'
                        filterOption={(input, option) =>
                          String(option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        placeholder='Выберите ответственного'
                        allowClear
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
                  <Col xs={24}>
                    <Form.Item label='Авторы (Исполнители)' name='author_ids'>
                      <Select
                        mode='multiple'
                        showSearch
                        optionFilterProp='label'
                        optionLabelProp='label'
                        filterOption={(input, option) =>
                          String(option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
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
                  <Col xs={24} md={8}>
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

                  <Col xs={24} md={8}>
                    <Form.Item label='Номер проекта' name='project_code'>
                      <Input placeholder='-' disabled />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
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
                      >
                        {referenceBooks?.contracts?.map(contract => (
                          <Option key={contract.id} value={contract.id}>
                            {contract.number}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
              Очистить форму
            </Button>
            <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
              Создать РИД
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
