import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Select, Switch, Space, Row, Col, Divider, Tag, Tooltip, DatePicker } from 'antd';
import {
  SaveOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  ExperimentOutlined,
  EnvironmentOutlined,
  CloudDownloadOutlined,
  ExceptionOutlined,
} from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useNotification } from '../../customhooks/useNotification';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { useCreatePartner, usePartnerByInn } from '../../api/partners/partnerApiHooks';
import { initialFormValues } from './data';
import { PartnerCompetence } from '../../types/partner';
import { partnerUploadFormMapper } from '../../helpers/mappers/partnerUploadFormMapper';
import styles from './PartnerFormPage.module.scss';

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
  } = useReferenceData(['partnerCategories', 'partnerTypes', 'partnerStatuses', 'competencies', 'partnerEconomicCategories']);

  const { mutate, isPending: isCreateLoading, isError: isCreateError, isSuccess: isCreateSuccess, error: createError } = useCreatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();

  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Контрагент успешно создан');
      setTimeout(() => navigate(-1), 1000);
    }
  }, [isCreateSuccess, createError, navigate, showNotification]);

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
      },
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
      onError: () => {
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
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader title="Создание нового контрагента" subtitle="Заполните данные контрагента" />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          initialValues={initialFormValues}
          onFinish={handleCreate}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          {/* 1. Реквизиты и идентификация */}
          <Divider orientation='left'>
            <BankOutlined /> Реквизиты и идентификация
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label='ИНН'
                name='inn'
                validateStatus={getFieldStatus('inn')}
                rules={[
                  { required: true, message: 'Введите ИНН' },
                  { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' },
                ]}
              >
                <Space.Compact className={styles.innInputContainer}>
                  <Form.Item name='inn' noStyle>
                    <Input placeholder='Введите ИНН' prefix={<BankOutlined />} className={styles.innInput} status={getFieldStatus('inn')} />
                  </Form.Item>
                  <Tooltip title='Загрузить данные компании по ИНН'>
                    <Button
                      type='primary'
                      icon={<CloudDownloadOutlined />}
                      onClick={handleUploadByInn}
                      loading={isLoadingInn}
                    />
                  </Tooltip>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label='КПП'
                name='kpp'
                validateStatus={getFieldStatus('kpp')}
                rules={[
                  { required: true, message: 'Введите КПП' },
                  { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр' },
                ]}
              >
                <Input placeholder='Введите КПП' prefix={<BankOutlined />} status={getFieldStatus('kpp')} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label='ОГРН'
                name='ogrn'
                validateStatus={getFieldStatus('ogrn')}
                rules={[
                  { pattern: /^$|^\d{13}$|^\d{15}$/, message: 'ОГРН должен содержать 13 или 15 цифр' },
                ]}
              >
                <Input placeholder='Введите ОГРН' prefix={<BankOutlined />} status={getFieldStatus('ogrn')} />
              </Form.Item>
            </Col>
          </Row>

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
              <Form.Item label='Краткое наименование' name='short_name'>
                <Input placeholder='Введите краткое наименование' prefix={<IdcardOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          {/* 2. Классификация */}
          <Divider orientation='left'>
            <SafetyCertificateOutlined /> Классификация
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item
                label='Категория'
                name='category_id'
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder='Инж. / Рес.'>
                  {referenceBooks.partnerCategories?.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                label='Статус'
                name='status_id'
                rules={[{ required: true, message: 'Выберите статус' }]}
              >
                <Select placeholder='Выберите статус' suffixIcon={<SafetyCertificateOutlined />}>
                  {referenceBooks.partnerStatuses?.map(status => (
                    <Option key={status.id} value={status.id}>{status.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item label='Экономическая группа' name='partner_economic_category_id'>
                <Select placeholder='Выберите группу' suffixIcon={<ExceptionOutlined />}>
                  {referenceBooks.partnerEconomicCategories?.map(category => (
                    <Option key={category.id} value={category.id}>{category.name}</Option>
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
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label='Ключевой поставщик' name='is_key_supplier' valuePropName='checked'>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label='Целевой поставщик' name='is_targeted' valuePropName='checked'>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label='Юр. проверка' name='legal_check_passed' valuePropName='checked'>
                <Switch checkedChildren='Пройдена' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label='Первичная оценка' name='initial_assessment_done' valuePropName='checked'>
                <Switch checkedChildren='Выполнена' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Компетенции' name='competence_ids'>
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

          {/* 3. Контакты и адреса */}
          <Divider orientation='left'>
            <EnvironmentOutlined /> Контакты и адреса
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

          {/* 4. Дополнительно */}
          <Divider orientation='left'>
            <IdcardOutlined /> Дополнительно
          </Divider>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Комментарий' name='comment'>
                <TextArea placeholder='Введите комментарий' rows={3} />
              </Form.Item>
            </Col>
          </Row>

          {/* Кнопки действий */}
          <div className={styles.formActions}>
            <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
              Очистить форму
            </Button>
            <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
              Создать контрагента
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
