import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useNotification } from '../../../customhooks/useNotification';
import { Loader } from '../../../components/loader/Loader';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { NotFound } from '../../../components/notFound/NotFound';
import dayjs from 'dayjs';
import { useContractById, useUpdateContract } from '../../../api/contracts/contractApiHooks';
import { contractUpdateFormMapper } from '../../../helpers/mappers/contractUpdateFormMapper';
import { numberFormatter, numberParser } from '../../../helpers/numberFormatters';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import styles from '../create/ContractCreatePage.module.scss';

const { Option } = Select;
const { TextArea } = Input;

export default function ContractEditPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: contract, isLoading: isContractLoading, isError: isContractError } = useContractById(contractId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['projects', 'partners', 'users', 'contractStates', 'contractCategories', 'contractTypes']);
  const {
    mutate,
    isPending: isUpdateLoading,
    isError: isUpdateError,
    isSuccess: isUpdateSuccess,
  } = useUpdateContract();

  useEffect(() => {
    if (contract) {
      form.setFieldsValue(contractUpdateFormMapper(contract));
    }
  }, [contract, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Договор успешно изменён');
      setTimeout(() => navigate(`/contracts/${contractId}`), 1000);
    } else if (isUpdateError) {
      showNotification('error', 'Ошибка', 'Не удалось изменить договор');
    }
  }, [isUpdateError, isUpdateSuccess, navigate, contractId, showNotification]);

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

  const handleSave = async (values: any) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const payload = getChangedFields(values, contractUpdateFormMapper(contract!));

    if (payload.date_signed && dayjs.isDayjs(payload.date_signed)) {
      payload.date_signed = payload.date_signed.format('YYYY-MM-DD');
    }
    if (payload.start_date && dayjs.isDayjs(payload.start_date)) {
      payload.start_date = payload.start_date.format('YYYY-MM-DD');
    }
    if (payload.end_date && dayjs.isDayjs(payload.end_date)) {
      payload.end_date = payload.end_date.format('YYYY-MM-DD');
    }

    mutate(
      { id: contractId!, data: payload },
      { onSettled: () => { isSubmittingRef.current = false; } }
    );
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleFormChange = () => {
    setIsFormChanged(true);
  };

  if (isReferencesLoading || isContractLoading) {
    return <Loader />;
  }

  if (isReferencesError || isContractError || !contract || !referenceBooks) {
    return <NotFound errorMessage='Не найден договор или справочник' />;
  }

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title={`Редактирование договора: ${contract.number}`}
        subtitle="Внесите изменения в данные договора"
      />

      <div className={styles.formCard}>
          <Form
            form={form}
            layout='vertical'
            onFieldsChange={handleFormChange}
            onFinish={handleSave}
            disabled={isUpdateLoading}
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

            <Row gutter={16}></Row>

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
                <Form.Item
                  label='Состояние'
                  name='state_id'
                  rules={[{ required: true, message: 'Выберите состояние' }]}
                >
                  <Select placeholder='Выберите состояние'>
                    {referenceBooks?.contractStates?.map(state => (
                      <Option key={state.id} value={state.id}>
                        {state.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Активен' name='is_active' valuePropName='checked'>
                  <Switch checkedChildren='Активен' unCheckedChildren='Не активен' />
                </Form.Item>
              </Col>
            </Row>

            <div className={styles.formActions}>
              <Button onClick={handleBack}>
                Отмена
              </Button>
              <Button
                type='primary'
                htmlType='submit'
                icon={<SaveOutlined />}
                loading={isUpdateLoading}
                disabled={!isFormChanged}
              >
                Сохранить изменения
              </Button>
            </div>
          </Form>
      </div>
    </div>
  );
}
