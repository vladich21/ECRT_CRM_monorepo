import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Select, Switch, Row, Col, Divider, InputNumber, DatePicker, Space } from 'antd';
import {
  CloseOutlined,
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
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { formatDate } from '../details/tabs/stages/data';
import { getContractStateTagClass } from '../utils/contractStateUtils';
import tagStyles from '../list/ContractsListPage.module.scss';
import styles from '../create/ContractCreatePage.module.scss';

const { Option } = Select;
const { TextArea } = Input;

export default function ContractEditPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  const wNumber = Form.useWatch('number', form) as string | undefined;
  const wCipher = Form.useWatch('cipher', form) as string | undefined;
  const wName = Form.useWatch('name', form) as string | undefined;
  const wCategoryId = Form.useWatch('category_id', form) as string | undefined;
  const wContractTypeId = Form.useWatch('contract_type_id', form) as string | undefined;
  const wStateId = Form.useWatch('state_id', form) as string | undefined;
  const wPartnerId = Form.useWatch('partner_id', form) as string | undefined;
  const wIsActive = Form.useWatch('is_active', form) as boolean | undefined;
  const wDateSigned = Form.useWatch('date_signed', form) as unknown;

  const handleBack = () => {
    navigate(`/contracts/${contractId}`);
  };

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

  const handleFormChange = () => {
    setIsFormChanged(true);
  };

  if (isReferencesLoading || isContractLoading) {
    return <Loader />;
  }

  if (isReferencesError || isContractError || !contract || !referenceBooks) {
    return <NotFound errorMessage='Не найден договор или справочник' />;
  }

  const headerNumber = wNumber ?? contract.number ?? '';
  const headerCipher = wCipher ?? contract.cipher ?? '';
  const title = `Договор №${headerNumber || '—'}${headerCipher ? ` (${headerCipher})` : ''}`;
  const contractState = getEntityById(wStateId ?? contract.state_id, referenceBooks?.contractStates);
  const contractCategoryName =
    getNameById(wCategoryId ?? contract.category_id, referenceBooks?.contractCategories ?? []) ?? '';
  const contractTypeName =
    getNameById(wContractTypeId ?? contract.contract_type_id, referenceBooks?.contractTypes ?? []) ?? '';
  const partnerName = getNameById(wPartnerId ?? contract.partner_id, referenceBooks?.partners ?? []) ?? '';
  const headerName = (wName ?? contract.name) || '';
  const isActive = (wIsActive ?? contract.is_active) ?? false;
  const signedText = (() => {
    const v = wDateSigned ?? contract.date_signed;
    if (!v) return '';
    if (dayjs.isDayjs(v)) return v.format('DD.MM.YYYY');
    if (typeof v === 'string') return formatDate(v);
    return '';
  })();

  return (
    <DetailPageHeader
      title={title}
      titleSuffix={
        <>
          {contractTypeName ? <span className={hStyles.metaText}>{contractTypeName}</span> : null}
          {signedText ? <span className={hStyles.metaText}>Подписан: {signedText}</span> : null}
        </>
      }
      backLabel="Договоры"
      onBack={handleBack}
      statusBadge={{
        label: isActive ? 'Действует' : 'Не действует',
        color: isActive ? '#52c41a' : '#ff4d4f',
      }}
      metaItems={[
        headerName ? <span key="name" className={hStyles.metaText}>{headerName}</span> : null,
        contractState ? (
          <span
            key="state"
            className={tagStyles[getContractStateTagClass(contractState.code) as keyof typeof tagStyles]}
          >
            {contractState.name}
          </span>
        ) : null,
        contractCategoryName ? (
          <span key="category" className={tagStyles.cardCategory}>{contractCategoryName}</span>
        ) : null,
        partnerName ? <span key="partner" className={hStyles.metaText}>{partnerName}</span> : null,
      ].filter(Boolean)}
      actions={
        <>
          <Button icon={<CloseOutlined />} onClick={handleBack} disabled={isUpdateLoading}>
            Отмена
          </Button>
          <Button
            type="primary"
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
      activeTab="main"
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
    >
      <div className={styles.formCard}>
          <Form
            form={form}
            layout='vertical'
            size="middle"
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
              <Col xs={24} md={4}>
                <Form.Item
                  label='Номер договора'
                  name='number'
                  rules={[{ required: true, message: 'Введите номер договора' }]}
                >
                  <Input placeholder='№123-Д' prefix={<NumberOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item label='Шифр договора' name='cipher'>
                  <Input placeholder='ДГ-2024-001' />
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
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

            <div className={styles.threeColSections}>
              <div className={styles.sectionBox}>
                <Divider orientation="left" style={{ marginTop: 0 }}>
                  <CalculatorOutlined /> Финансовые условия
                </Divider>
                <Row gutter={16}>
                  <Col xs={24}>
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
                  <Col xs={24}>
                    <Form.Item
                      label='Ставка НДС (%)'
                      name='vat_rate'
                      rules={[{ required: true, message: 'Введите ставку НДС' }]}
                    >
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
                <Divider orientation="left" style={{ marginTop: 0 }}>
                  <CalendarOutlined /> Сроки действия
                </Divider>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      label='Дата начала'
                      name='start_date'
                      rules={[{ required: true, message: 'Выберите дату начала' }]}
                    >
                      <DatePicker placeholder='Выберите дату начала' style={{ width: '100%' }} format='DD.MM.YYYY' />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item label='Дата окончания' name='end_date'>
                      <DatePicker placeholder='Выберите дату окончания' style={{ width: '100%' }} format='DD.MM.YYYY' />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      label='Дата подписания'
                      name='date_signed'
                      rules={[{ required: true, message: 'Выберите дату подписания' }]}
                    >
                      <DatePicker placeholder='Выберите дату подписания' style={{ width: '100%' }} format='DD.MM.YYYY' />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className={styles.sectionBox}>
                <Divider orientation="left" style={{ marginTop: 0 }}>
                  <UnorderedListOutlined /> Классификация
                </Divider>
                <Row gutter={16}>
                  <Col xs={24}>
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
                  <Col xs={24}>
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
              </div>

              <div className={styles.sectionBox}>
                <Divider orientation="left" style={{ marginTop: 0 }}>
                  <CheckCircleOutlined /> Состояние и статус
                </Divider>
                <Row gutter={16}>
                  <Col xs={24}>
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
                  <Col xs={24}>
                    <Form.Item label='Активен' name='is_active' valuePropName='checked'>
                      <Switch checkedChildren='Активен' unCheckedChildren='Не активен' />
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
