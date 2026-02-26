import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Select, Space, Row, Col, Divider, Tag, Tooltip } from 'antd';
import styles from './PartnerCreatePage.module.scss';
import {
  SaveOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  PlusOutlined,
  ExperimentOutlined,
  EnvironmentOutlined,
  CloudDownloadOutlined,
  ExceptionOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useNotification } from '../../customhooks/useNotification';
import { BackButton } from '../../components/backButton/BackButton';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { useCreatePartner, usePartnerByInn } from '../../api/partners/partnerApiHooks';
import { initialFormValues } from './data';
import { PartnerCompetence } from '../../types/partner';
import { partnerUploadFormMapper } from '../../helpers/mappers/partnerUploadFormMapper';

const { Option } = Select;
const { TextArea } = Input;

export default function PartnerCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [errorFields, setErrorFields] = useState<string[]>([]);

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies', 'partnerEconomicCategories']);

  const { mutate, isPending: isCreateLoading, isError: isCreateError, isSuccess: isCreateSuccess, error: createError } = useCreatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Контрагент успешно создан');
      setTimeout(() => navigate(-1), 1000);
    }
  }, [ isCreateSuccess, createError, navigate, showNotification]);

  const isSubmittingRef = useRef(false);

  const handleCreate = async (values: any) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorFields([]);

    const payload = {
    ...values,
    status_id: values.status_id || null,
    type_ids: values.type_ids || [],
    competence_ids: values.competence_ids || [],
    partner_economic_category_id: values.partner_economic_category_id,
  };

  mutate(payload, {
    onSettled: () => {
      isSubmittingRef.current = false;
    },
    onError: (error: any) => {
      const message = error?.message || 'Не удалось создать контрагента';
      const isInnKppDuplicate = message.includes('ИНН и КПП');
      const isInnRequired = message.includes('ИНН обязателен');
      const isKppRequired = message.includes('КПП обязателен');

      if (isInnKppDuplicate) {
        setErrorFields(['inn', 'kpp']);
        form.setFields([
          { name: 'inn', errors: ['Контрагент с такой комбинацией ИНН и КПП уже существует'] },
          { name: 'kpp', errors: ['Контрагент с такой комбинацией ИНН и КПП уже существует'] },
        ]);
      } else if (isInnRequired) {
        setErrorFields(['inn']);
        form.setFields([{ name: 'inn', errors: ['ИНН обязателен для заполнения'] }]);
      } else if (isKppRequired) {
        setErrorFields(['kpp']);
        form.setFields([{ name: 'kpp', errors: ['КПП обязателен для заполнения'] }]);
      }
      showNotification('error', 'Ошибка', message);
    }
  });
};
const getFieldStatus = (fieldName: string) => {
    return errorFields.includes(fieldName) ? 'error' : undefined;
  };
  const handleUploadByInn = async () => {
    getPartnerDataByInn(form.getFieldValue('inn'), {
      onSuccess: data => {
        form.setFieldsValue(partnerUploadFormMapper(data as any));
        showNotification('success', 'Успех', 'Контрагент успешно подгружен');
      },
      onError: e => {
        showNotification('error', 'Ошибка', 'Не удалось подгрузить контрагента');
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
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' className={styles.container}>
        <BackButton />

        <Card
          title={
            <span>
              <PlusOutlined className={styles.iconMargin} />
              Создание нового контрагента
            </span>
          }
        >
          <Form
            form={form}
            layout='vertical'
            initialValues={initialFormValues}
            onFinish={handleCreate}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            scrollToFirstError
          >
            {/* Основные реквизиты */}
            <Divider orientation='left'>
              <IdcardOutlined /> Основные реквизиты
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Полное наименование'
                  name='name'
                  rules={[{ required: true, message: 'Введите полное наименование' }]}
                >
                  <Input placeholder='Введите полное наименование' prefix={<IdcardOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label='Краткое наименование'
                  name='short_name'
                  rules={[{ message: 'Введите краткое наименование' }]}
                >
                  <Input placeholder='Введите краткое наименование' prefix={<IdcardOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label='Комментарий' name='comment'>
                  <TextArea placeholder='Введите комментарий' rows={3} />
                </Form.Item>
              </Col>
            </Row>

            {/* Статус и тип */}
            <Divider orientation='left'>
              <SafetyCertificateOutlined /> Общая информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item
                  label='Статус контрагента'
                  name='status_id'
                  rules={[{ required: true, message: 'Выберите статус' }]}
                >
                  <Select placeholder='Выберите статус' suffixIcon={<SafetyCertificateOutlined />}>
                    {referenceBooks.partnerStatuses?.map(status => (
                      <Option key={status.id} value={status.id}>
                        {status.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  label='Экономическая группа'
                  name='partner_economic_category_id'
                  // rules={[{ required: true, message: 'Выберите группу' }]}
                >
                  <Select placeholder='Выберите группу' suffixIcon={<ExceptionOutlined />}>
                    {referenceBooks.partnerEconomicCategories?.map(status => (
                      <Option key={status.id} value={status.id}>
                        {status.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item
                  label='Тип контрагента'
                  name='type_ids'
                  rules={[{ required: true, message: 'Выберите тип' }]}
                >
                  <Select mode='multiple' placeholder='Выберите тип' suffixIcon={<SafetyCertificateOutlined />}>
                    {referenceBooks.partnerTypes?.map(type => (
                      <Option key={type.id} value={type.id}>
                        {type.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={6}>
                <Form.Item label='Компетенции контрагента' name='competence_ids'>
                  <Select
                    mode='multiple'
                    placeholder='Выберите компетенции'
                    suffixIcon={<ExperimentOutlined />}
                    optionLabelProp='label'
                    tagRender={({ label, value, onClose }) => {
                      const competence = referenceBooks.competencies?.find((comp: any) => comp.id === value);
                      return (
                        <Tag
                          onClose={onClose}
                          closable
                          className={styles.competenceTag}
                          style={{
                            backgroundColor: competence?.color_bg || '#1890ff',
                            color: competence?.color_text || '#ffffff',
                            border: `1px solid ${competence?.color_border || '#1890ff'}`,
                          }}
                        >
                          {label}
                        </Tag>
                      );
                    }}
                  >
                    {referenceBooks.competencies?.map((competence: PartnerCompetence) => (
                      <Option key={competence.id} value={competence.id} label={competence.name}>
                        <div className={styles.competenceOptionContainer}>
                          <Tag
                            className={styles.competenceOptionTag}
                            style={{
                              backgroundColor: competence.color_bg || '#1890ff',
                              color: competence.color_text || '#ffffff',
                              border: `1px solid ${competence.color_border || '#1890ff'}`,
                            }}
                          >
                            {competence.name}
                          </Tag>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Адреса */}
            <Divider orientation='left'>
              <EnvironmentOutlined /> Адреса
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label='Юридический адрес' name='legal_address'>
                  <Input placeholder='Введите юридический адрес' prefix={<EnvironmentOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label='Фактический адрес' name='actual_address'>
                  <Input placeholder='Введите фактический адрес' prefix={<EnvironmentOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            {/* Контактная информация */}
            <Divider orientation='left'>
              <PhoneOutlined /> Контактная информация
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  label='Телефон'
                  name='phone'
                  rules={[
                    {
                      pattern: /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
                      message: 'Введите корректный номер телефона (например: +7 (999) 999-99-99)',
                    },
                  ]}
                >
                  <Input placeholder='Введите телефон' prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Email' name='email' rules={[{ type: 'email', message: 'Введите корректный email' }]}>
                  <Input placeholder='Введите email' prefix={<MailOutlined />} />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='Сайт' name='website'>
                  <Input placeholder='Введите сайт' prefix={<GlobalOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            {/* Реквизиты */}
            <Divider orientation='left'>
              <BankOutlined /> Реквизиты
            </Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label='ИНН' name='inn'  validateStatus={getFieldStatus('inn')} rules={[
                { required: true, message: 'Введите ИНН' },
                { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' }
              ]}>
                  <Space.Compact className={styles.innInputContainer}>
                    <Form.Item name='inn' noStyle>
                      <Input placeholder='Введите ИНН' prefix={<BankOutlined />} className={styles.innInput} status={getFieldStatus('inn')} />
                    </Form.Item>
                    <Tooltip title='Загрузить данные компании по ИНН'>
                      <Button
                        type='primary'
                        size='middle'
                        className={styles.innButton}
                        onClick={handleUploadByInn}
                        loading={isLoadingInn}
                      >
                        <CloudDownloadOutlined />
                      </Button>
                    </Tooltip>
                  </Space.Compact>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='КПП' name='kpp' validateStatus={getFieldStatus('kpp')} rules={[
                { required: true, message: 'Введите КПП' },
                { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр' }
              ]}>
                  <Input placeholder='Введите КПП' prefix={<BankOutlined />}  status={getFieldStatus('kpp')}/>
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item label='ОГРН' name='ogrn'  validateStatus={getFieldStatus('ogrn')} rules={[
                { pattern: /^$|^\d{13}$|^\d{15}$/, message: 'ОГРН должен содержать 13 или 15 цифр' }
              ]} >
                  <Input placeholder='Введите ОГРН' prefix={<BankOutlined />} status={getFieldStatus('ogrn')}/>
                </Form.Item>
              </Col>
            </Row>

            {/* Кнопки действий */}
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading} size='large'>
                  Создать контрагента
                </Button>

                <Button onClick={() => form.resetFields()} size='large' disabled={isCreateLoading}>
                  Очистить форму
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}
