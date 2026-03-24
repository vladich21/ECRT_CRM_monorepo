import { useEffect, useRef } from 'react';
import {
  CalculatorOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  NumberOutlined,
  ProjectOutlined,
  SaveOutlined,
  TagOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Space } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import type { CreateContractPayload } from '../../../api/contracts/contractApi';
import { useCreateContract } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { BackButton } from '../../../components/backButton/BackButton';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { numberFormatter, numberParser } from '../../../helpers/numberFormatters';
import { initialFormValues } from '../list/data';
import styles from './ContractCreatePage.module.scss';

const { Option } = Select;
const { TextArea } = Input;
export default function ContractCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const partnerIdFromState = (location.state as any)?.partnerId;
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['projects', 'partners', 'users', 'contractStates', 'contractCategories', 'contractTypes']);
  const {
    mutate,
    isPending: isCreateLoading,
    isError: isCreateError,
    isSuccess: isCreateSuccess,
  } = useCreateContract();
  useEffect(() => {
    const draftState = referenceBooks?.contractStates?.find(
      state => state.code === 'draft' || state.name.toLowerCase().includes('чернов'),
    );
    if (draftState && !form.getFieldValue('state_id')) {
      form.setFieldValue('state_id', draftState.id);
    }
    if (partnerIdFromState && !form.getFieldValue('partner_id')) {
      form.setFieldValue('partner_id', partnerIdFromState);
    }
  }, [referenceBooks?.contractStates, form, partnerIdFromState]);
  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Договор успешно создан');
      if (partnerIdFromState) {
        setTimeout(() => navigate(`/partners/${partnerIdFromState}/contracts`), 1000);
      } else {
        setTimeout(() => navigate(-1), 1000);
      }
    } else if (isCreateError) {
      showNotification('error', 'Ошибка', 'Не удалось создать договор');
    }
  }, [isCreateError, isCreateSuccess, navigate, showNotification, partnerIdFromState]);
  const calculateAmounts = (amountExclVal: number, vatRate: number) => {
    const amountVat = amountExclVal * (vatRate / 100);
    const amountInclVat = amountExclVal + amountVat;
    form.setFieldsValue({
      amount_vat: Math.round(amountVat * 100) / 100,
      amount_incl_vat: Math.round(amountInclVat * 100) / 100,
    });
  };
  const handleAmountChange = (value: number | null) => {
    const vatRate = form.getFieldValue('vat_rate');
    if (value != null && vatRate != null) {
      calculateAmounts(value, Number(vatRate));
    }
  };
  const handleVatRateChange = (value: number | null) => {
    const amountExclVal = form.getFieldValue('amount_excl_vat');
    if (value != null && amountExclVal != null) {
      calculateAmounts(Number(amountExclVal), value);
    }
  };
  const isSubmittingRef = useRef(false);
  const handleCreate = async (values: Record<string, unknown>) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const strOrNull = (v: unknown): string | null => {
      if (v == null || typeof v !== 'string') return null;
      const t = v.trim();
      return t.length ? t : null;
    };
    const numOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const payload: CreateContractPayload = {
      number: strOrNull(values.number),
      cipher: strOrNull(values.cipher),
      name: strOrNull(values.name),
      description: strOrNull(values.description),
      partner_id: (values.partner_id as string | undefined) || null,
      responsible_id: (values.responsible_id as string | undefined) || null,
      project_id: (values.project_id as string | undefined) || null,
      contract_type_id: (values.contract_type_id as string | undefined) || null,
      category_id: (values.category_id as string | undefined) || null,
      date_signed: values.date_signed
        ? (values.date_signed as { format: (f: string) => string }).format('YYYY-MM-DD')
        : null,
      start_date: values.start_date
        ? (values.start_date as { format: (f: string) => string }).format('YYYY-MM-DD')
        : null,
      end_date: values.end_date
        ? (values.end_date as { format: (f: string) => string }).format('YYYY-MM-DD')
        : null,
      amount_excl_vat: numOrNull(values.amount_excl_vat),
      vat_rate: numOrNull(values.vat_rate),
      amount_vat: numOrNull(values.amount_vat),
      amount_incl_vat: numOrNull(values.amount_incl_vat),
      state_id: (values.state_id as string | undefined) || null,
      is_active: values.is_active as boolean | undefined,
    };
    mutate(payload, {
      onSettled: () => {
        isSubmittingRef.current = false;
      },
    });
  };
  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  return (
    <DetailPageHeader
      title='Создание нового договора'
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные для создания договора</span>}
      backLabel='Договоры'
      onBack={() => navigate(-1)}
      actions={
        <>
          <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
            Очистить форму
          </Button>
          <Button type='primary' icon={<SaveOutlined />} loading={isCreateLoading} onClick={() => form.submit()}>
            Создать договор
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Создание' }]}
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
          initialValues={initialFormValues}
          onFinish={handleCreate}
          disabled={isCreateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          scrollToFirstError
        >
          <Divider orientation='left'>
            <FileTextOutlined /> Основные реквизиты
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label='Номер договора' name='number'>
                <Input placeholder='№123-Д' prefix={<NumberOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={4}>
              <Form.Item label='Шифр договора' name='cipher'>
                <Input placeholder='ДГ-2024-001' />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item label='Название' name='name'>
                <Input placeholder='Введите название договора' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Описание' name='description'>
                <TextArea placeholder='Введите описание договора' rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label='Партнёр' name='partner_id'>
                <Select
                  placeholder='Выберите партнёра'
                  allowClear
                  showSearch
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    String(option?.children ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  suffixIcon={<TeamOutlined />}
                >
                  {referenceBooks?.partners?.map(partner => (
                    <Option key={partner.id} value={partner.id}>
                      {partner.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label='Проект' name='project_id'>
                <Select
                  placeholder='Выберите проект'
                  allowClear
                  showSearch
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    String(option?.children ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
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
              <Form.Item label='Ответственный' name='responsible_id'>
                <Select
                  placeholder='Выберите ответственного'
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
                    <Option key={user.id} value={user.id} label={user.name}>
                      {user.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className={styles.threeColSections}>
            <div className={styles.sectionBox}>
              <Divider orientation='left' style={{ marginTop: 0 }}>
                <CalculatorOutlined /> Финансовые условия
              </Divider>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label='Сумма без НДС' name='amount_excl_vat'>
                    <InputNumber
                      placeholder='0.00'
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                      onChange={handleAmountChange}
                      formatter={value => numberFormatter(value)}
                      parser={value => numberParser(value) as any}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label='Ставка НДС (%)' name='vat_rate'>
                    <Space.Compact block style={{ width: '100%' }}>
                      <InputNumber
                        placeholder='0'
                        style={{ flex: 1, minWidth: 0 }}
                        min={0}
                        max={100}
                        step={1}
                        precision={0}
                        onChange={handleVatRateChange}
                      />
                      <Input
                        readOnly
                        value='%'
                        style={{
                          width: 44,
                          textAlign: 'center',
                          pointerEvents: 'none',
                          color: 'rgba(0, 0, 0, 0.45)',
                        }}
                      />
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label='Сумма с НДС' name='amount_incl_vat'>
                    <InputNumber
                      placeholder='0.00'
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                      disabled
                      formatter={value => numberFormatter(value)}
                      parser={value => numberParser(value) as any}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.sectionBox}>
              <Divider orientation='left' style={{ marginTop: 0 }}>
                <CalendarOutlined /> Сроки действия
              </Divider>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label='Дата начала' name='start_date'>
                    <DatePicker placeholder='Выберите дату начала' style={{ width: '100%' }} format='DD.MM.YYYY' />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label='Дата окончания' name='end_date'>
                    <DatePicker placeholder='Выберите дату окончания' style={{ width: '100%' }} format='DD.MM.YYYY' />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label='Дата подписания' name='date_signed'>
                    <DatePicker placeholder='Выберите дату подписания' style={{ width: '100%' }} format='DD.MM.YYYY' />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.sectionBox}>
              <Divider orientation='left' style={{ marginTop: 0 }}>
                <UnorderedListOutlined /> Классификация
              </Divider>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label='Категория' name='category_id'>
                    <Select placeholder='Выберите категорию' suffixIcon={<TagOutlined />}>
                      {referenceBooks?.contractCategories?.map(category => (
                        <Option key={category.id} value={category.id}>
                          {category.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label='Тип' name='contract_type_id'>
                    <Select placeholder='Выберите тип' suffixIcon={<TagOutlined />} optionLabelProp='label' allowClear>
                      {referenceBooks?.contractTypes?.map(type => (
                        <Option key={type.id} value={type.id} label={type.name}>
                          {type.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className={styles.sectionBox}>
              <Divider orientation='left' style={{ marginTop: 0 }}>
                <CheckCircleOutlined /> Состояние и статус
              </Divider>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label='Состояние' name='state_id'>
                    <Select placeholder='Черновик' disabled style={{ cursor: 'not-allowed' }}>
                      {referenceBooks?.contractStates?.map(state => (
                        <Option key={state.id} value={state.id}>
                          {state.name}
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
