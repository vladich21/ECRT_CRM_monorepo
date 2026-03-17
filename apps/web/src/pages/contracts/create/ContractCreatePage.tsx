import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Select, Switch, Row, Col, Divider, InputNumber, DatePicker } from 'antd';
import {
  SaveOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  ProjectOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  NumberOutlined,
  TagOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { useCreateContract } from '../../../api/contracts/contractApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { initialFormValues } from '../list/data';
import { numberFormatter, numberParser } from '../../../helpers/numberFormatters';
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
    const draftState = referenceBooks?.contractStates?.find(state =>
      state.code === 'draft' || state.name.toLowerCase().includes('чернов')
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
    const vatRate = form.getFieldValue('vat_rate') || 0;
    if (value && vatRate) {
      calculateAmounts(value, vatRate);
    }
  };

  const handleVatRateChange = (value: number | null) => {
    const amountExclVal = form.getFieldValue('amount_excl_vat') || 0;
    if (value && amountExclVal) {
      calculateAmounts(amountExclVal, value);
    }
  };

  const isSubmittingRef = useRef(false);

  const handleCreate = async (values: any) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const payload = {
      ...values,
      partner_id: values.partner_id,
      responsible_id: values.responsible_id,
      project_id: values.project_id || null,
      contract_type_id: values.contract_type_id || null,
      date_signed: values.date_signed ? values.date_signed.format('YYYY-MM-DD') : null,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      amount_excl_vat: Number(values.amount_excl_vat) || 0,
      vat_rate: Number(values.vat_rate) || 0,
      amount_vat: Number(values.amount_vat) || 0,
      amount_incl_vat: Number(values.amount_incl_vat) || 0,
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
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title="Создание нового договора" subtitle="Заполните данные для создания договора" />

      <div className={styles.formCard}>
          <Form
            form={form}
            layout='vertical'
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
            {/* Основные реквизиты */}
            <Divider orientation='left'>
              <FileTextOutlined /> Основные реквизиты
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Номер договора'
                  name='number'
                  rules={[{ required: true, message: 'Введите номер договора' }]}
                >
                  <Input placeholder='№123-Д' prefix={<NumberOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Шифр договора' name='cipher'>
                  <Input placeholder='ДГ-2024-001' />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label='Название'
                  name='name'
                  rules={[{ required: true, message: 'Введите название договора' }]}
                >
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
                <Form.Item label='Партнёр' name='partner_id' rules={[{ required: true, message: 'Выберите партнёра' }]}>
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
                <Form.Item
                  label='Ответственный'
                  name='responsible_id'
                  rules={[{ required: true, message: 'Выберите ответственного' }]}
                >
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

            {/* Классификация */}
            <Divider orientation='left'>
              <UnorderedListOutlined /> Классификация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Категория'
                  name='category_id'
                  rules={[{ required: true, message: 'Выберите категорию' }]}
                >
                  <Select placeholder='Выберите категорию' suffixIcon={<TagOutlined />}>
                    {referenceBooks?.contractCategories?.map(category => (
                      <Option key={category.id} value={category.id}>
                        {category.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Тип' name='contract_type_id'>
                  <Select
                    placeholder='Выберите тип'
                    suffixIcon={<TagOutlined />}
                    optionLabelProp='label'
                    allowClear
                  >
                    {referenceBooks?.contractTypes?.map(type => (
                      <Option key={type.id} value={type.id} label={type.name}>
                        {type.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Финансовые условия */}
            <Divider orientation='left'>
              <CalculatorOutlined /> Финансовые условия
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Сумма без НДС'
                  name='amount_excl_vat'
                  rules={[{ required: true, message: 'Введите сумму без НДС' }]}
                >
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

              <Col xs={24} md={8}>
                <Form.Item
                  label='Ставка НДС (%)'
                  name='vat_rate'
                  rules={[{ required: true, message: 'Введите ставку НДС' }]}
                >
                  <InputNumber
                    placeholder='0'
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    step={1}
                    precision={0}
                    onChange={handleVatRateChange}
                    addonAfter='%'
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
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

            {/* Сроки действия */}
            <Divider orientation='left'>
              <CalendarOutlined /> Сроки действия
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Дата начала'
                  name='start_date'
                  rules={[{ required: true, message: 'Выберите дату начала' }]}
                >
                  <DatePicker placeholder='Выберите дату начала' style={{ width: '100%' }} format='DD.MM.YYYY' />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Дата окончания' name='end_date'>
                  <DatePicker placeholder='Выберите дату окончания' style={{ width: '100%' }} format='DD.MM.YYYY' />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item
                  label='Дата подписания'
                  name='date_signed'
                  rules={[{ required: true, message: 'Выберите дату подписания' }]}
                >
                  <DatePicker placeholder='Выберите дату подписания' style={{ width: '100%' }} format='DD.MM.YYYY' />
                </Form.Item>
              </Col>
            </Row>

            {/* Состояние и статус */}
            <Divider orientation='left'>
              <CheckCircleOutlined /> Состояние и статус
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Состояние' name='state_id'>
                  <Select
                    placeholder='Черновик'
                    disabled
                    style={{ cursor: 'not-allowed' }}
                  >
                    {referenceBooks?.contractStates?.map(state => (
                      <Option key={state.id} value={state.id}>
                        {state.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Активен' name='is_active' valuePropName='checked' initialValue={true}>
                  <Switch checkedChildren='Активен' unCheckedChildren='Не активен' defaultChecked />
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <div className={styles.formActions}>
              <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
                Очистить форму
              </Button>
              <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
                Создать договор
              </Button>
            </div>
          </Form>
      </div>
    </div>
  );
}
