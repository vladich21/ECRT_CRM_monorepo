import { useEffect, useMemo, useState } from 'react';
import {
  BankOutlined,
  CalendarOutlined,
  CloseOutlined,
  FileTextOutlined,
  GlobalOutlined,
  NumberOutlined,
  ProjectOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useContractById } from '../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { usePatentById, useUpdatePatent } from '../../api/patents/patentApiHooks';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader, {
  detailHeaderVariantForPatentRecord,
  detailPageHeaderStyles as hStyles,
} from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { formReferenceId } from '../../helpers/formReferenceId';
import { getEntityById } from '../../helpers/getEntityById';
import { getNameById } from '../../helpers/getNameById';
import { patentUpdateFormMapper } from '../../helpers/mappers/patentUpdateFormMapper';
import styles from './PatentFormPage.module.scss';

const { Option } = Select;
const { TextArea } = Input;
export default function PatentEditPage() {
  const { patentId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: patent, isLoading: isPatentLoading, isError: isPatentError } = usePatentById(patentId!);
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
  const { mutate, isPending: isUpdateLoading, isError: isUpdateError, isSuccess: isUpdateSuccess } = useUpdatePatent();
  useEffect(() => {
    if (patent) form.setFieldsValue(patentUpdateFormMapper(patent, referenceBooks));
  }, [patent, form, referenceBooks]);
  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Патент успешно изменён');
      setTimeout(() => navigate(-1), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить патент');
    }
  }, [isUpdateError, isUpdateSuccess]);
  const handleUpdate = async (values: any) => {
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
      intellectprop_id: values.intellectprop_id || null,
      status_id: values.status_id || null,
      area_ids: areaIds,
      author_ids: authorIds,
    };
    delete payload['project_code'];
    mutate({ id: patentId!, data: payload });
  };
  const handleProjectChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('project_id', value);
      form.setFieldValue('project_code', getEntityById(value, referenceBooks?.projects)?.code);
    } else {
      form.setFieldValue('project_code', '');
    }
  };

  const watchName = Form.useWatch('name', form);
  const watchIntellectPropId = Form.useWatch('intellectprop_id', form);
  const watchStatusId = Form.useWatch('status_id', form);
  const watchDepartmentId = Form.useWatch('department_id', form);
  const watchRegNumber = Form.useWatch('registration_number', form);

  const incomeContractMissingFromPicker =
    Boolean(patent?.contract_id) &&
    !(referenceBooks?.contracts ?? []).some(row => row.id === patent?.contract_id);
  const incomeContractFetchId = incomeContractMissingFromPicker && patent?.contract_id ? patent.contract_id : '';
  const { data: incomeContractFetched } = useContractById(incomeContractFetchId);
  const incomeContractOptions = useMemo(() => {
    const options = [...(referenceBooks?.contracts ?? [])];
    if (incomeContractFetched && !options.some(row => row.id === incomeContractFetched.id)) {
      options.unshift(incomeContractFetched);
    }
    return options;
  }, [referenceBooks?.contracts, incomeContractFetched]);

  if (isReferencesLoading || isPatentLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks || isPatentError || !patent) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  const recordStatusLabel = patent.is_deleted ? 'Удалён' : 'Активен';
  const recordStatusVariant = detailHeaderVariantForPatentRecord(patent.is_deleted);
  const headerName = (watchName ?? patent.name) || '';
  const headerRegNumber = (watchRegNumber ?? patent.registration_number) || '';
  const intellectpropId = formReferenceId(watchIntellectPropId, patent.intellectprop_id);
  const patentStatusId = formReferenceId(watchStatusId, patent.status_id);
  const departmentId = formReferenceId(watchDepartmentId, patent.department_id);
  const ipTypeName = getNameById(intellectpropId, referenceBooks.patentIntellectProps) || '';
  const statusName = getNameById(patentStatusId, referenceBooks.patentStatuses) || '';
  const deptName = getNameById(departmentId, referenceBooks.departments) || '';
  return (
    <DetailPageHeader
      title={`Редактирование: РИД ${headerRegNumber || '—'}`}
      titleWeight='medium'
      backLabel='Реестр РИД'
      onBack={() => navigate(-1)}
      statusBadge={{
        label: recordStatusLabel,
        variant: recordStatusVariant,
      }}
      metaItems={[
        headerName ? (
          <span key='name' className={hStyles.metaText}>
            {headerName}
          </span>
        ) : null,
        ipTypeName ? (
          <span key='ipType' className={hStyles.metaType}>
            {ipTypeName}
          </span>
        ) : null,
        statusName ? (
          <span key='status' className={hStyles.metaType}>
            {statusName}
          </span>
        ) : null,
        deptName ? (
          <span key='dept' className={hStyles.metaText}>
            <TeamOutlined /> {deptName}
          </span>
        ) : null,
      ].filter(Boolean)}
      actions={
        <>
          <Button icon={<CloseOutlined />} onClick={() => navigate(-1)} disabled={isUpdateLoading}>
            Отмена
          </Button>
          <Button
            type='primary'
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={isUpdateLoading}
            disabled={!isFormChanged}
          >
            Сохранить
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Редактирование' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
    >
      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          size='middle'
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleUpdate}
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
                    <Select
                      mode='multiple'
                      showSearch
                      maxTagCount='responsive'
                      optionFilterProp='children'
                      filterOption={(input, option) =>
                        String(option?.children ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      placeholder='Выберите области'
                      suffixIcon={<GlobalOutlined />}
                    >
                      {referenceBooks?.patentAreas?.map(area => (
                        <Option key={area.id} value={area.id}>
                          {area.name}
                        </Option>
                      ))}
                    </Select>
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
                        maxTagCount='responsive'
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
                        {incomeContractOptions.map(row => (
                          <Option key={row.id} value={row.id}>
                            {row.number || row.name || row.id}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </DetailPageHeader>
  );
}
