import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Button, Select, Switch, Space, Row, Col, Divider, Tag, Tooltip, DatePicker } from 'antd';
import {
  CloseOutlined,
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
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import { detailPageHeaderStyles as hStyles } from '../../components/pageLayout/DetailPageHeader';
import { Loader } from '../../components/loader/Loader';
import { getChangedFields } from '../../helpers/getChangedFields';
import { usePartnerById, usePartnerByInn, useUpdatePartner } from '../../api/partners/partnerApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { partnerUpdateFormMapper } from '../../helpers/mappers/partnerUpdateFormMapper';
import { partnerUploadFormMapper } from '../../helpers/mappers/partnerUploadFormMapper';
import styles from './PartnerFormPage.module.scss';

const { Option } = Select;
const { TextArea } = Input;

export default function PartnerEditPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: partner, isLoading: isPartnerLoading, isError: isPartnerError } = usePartnerById(partnerId!);

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['partnerCategories', 'partnerTypes', 'partnerStatuses', 'competencies', 'partnerEconomicCategories']);

  const { mutate, isPending: isUpdateLoading, isError: isUpdateError, isSuccess: isUpdateSuccess, error: updateError } =
    useUpdatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();
  const isSubmittingRef = useRef(false);

  // IMPORTANT: keep all hooks (including Form.useWatch) unconditional
  const wName = Form.useWatch('name', form) as string | undefined;
  const wShortName = Form.useWatch('short_name', form) as string | undefined;
  const wInn = Form.useWatch('inn', form) as string | undefined;
  const wStatusId = Form.useWatch('status_id', form) as string | undefined;
  const wTypeIds = Form.useWatch('type_ids', form) as string[] | undefined;

  useEffect(() => {
    if (partner && referenceBooks?.partnerStatuses) {
      form.setFieldsValue(partnerUpdateFormMapper(partner));
    }
  }, [partner, referenceBooks, form]);

  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Контрагент успешно изменён');
      setTimeout(() => navigate(-1), 1000);
    } else if (isUpdateError) {
      const message = (updateError as any)?.message || 'Не удалось изменить контрагента';
      showNotification('error', 'Ошибка', message);
    }
  }, [isUpdateError, isUpdateSuccess, updateError]);

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

  if (isReferencesLoading || isPartnerLoading) {
    return <Loader />;
  }

  if (isReferencesError || isPartnerError) {
    return <NotFound errorMessage='Контрагент не найден' />;
  }

  const headerTitle =
    (wShortName ?? partner?.short_name) ||
    (wName ?? partner?.name) ||
    'Контрагент';
  const statusName =
    referenceBooks?.partnerStatuses?.find((s) => String(s.id) === String(wStatusId ?? partner?.status_id))?.name;
  const typeNames = (wTypeIds ?? partner?.type_ids ?? [])
    .map((id) => referenceBooks?.partnerTypes?.find((t) => String(t.id) === String(id))?.name)
    .filter(Boolean);

  const handleSave = async (values: any) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const payload = getChangedFields(values, partnerUpdateFormMapper(partner!));
    payload.type_ids = values.type_ids ?? [];
    payload.competence_ids = values.competence_ids ?? [];
    mutate(
      { id: partnerId!, data: payload },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  };

  return (
    <DetailPageHeader
      title={`Редактирование: ${headerTitle}`}
      backLabel="Контрагенты"
      onBack={() => navigate(-1)}
      statusBadge={
        statusName
          ? { label: statusName, color: statusName === 'Активный' ? '#52c41a' : '#1677ff' }
          : undefined
      }
      metaItems={[
        (wInn ?? partner?.inn) && (
          <span key="inn" className={hStyles.metaText}>
            <BankOutlined /> ИНН {wInn ?? partner?.inn}
          </span>
        ),
        typeNames.length > 0 && (
          <span key="types" className={hStyles.metaText}>
            {typeNames.join(', ')}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button icon={<CloseOutlined />} onClick={() => navigate(-1)} disabled={isUpdateLoading}>
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
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleSave}
          disabled={isUpdateLoading}
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
                rules={[
                  { required: true, message: 'Введите ИНН' },
                  { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' },
                ]}
              >
                <Space.Compact className={styles.innInputContainer}>
                  <Form.Item name='inn' noStyle>
                    <Input placeholder='Введите ИНН' prefix={<BankOutlined />} className={styles.innInput} />
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
                rules={[
                  { required: true, message: 'Введите КПП' },
                  { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр' },
                ]}
              >
                <Input placeholder='Введите КПП' prefix={<BankOutlined />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label='ОГРН'
                name='ogrn'
                rules={[
                  { pattern: /^$|^\d{13}$|^\d{15}$/, message: 'ОГРН должен содержать 13 или 15 цифр' },
                ]}
              >
                <Input placeholder='Введите ОГРН' prefix={<BankOutlined />} />
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
                  {referenceBooks?.partnerCategories?.map(cat => (
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
                  {referenceBooks?.partnerStatuses?.map(status => (
                    <Option key={status.id} value={String(status.id)}>{status.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item label='Экономическая группа' name='partner_economic_category_id'>
                <Select placeholder='Выберите группу' suffixIcon={<ExceptionOutlined />}>
                  {referenceBooks?.partnerEconomicCategories?.map(category => (
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
                  {referenceBooks?.partnerTypes?.map(type => (
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
            <Col xs={24} md={24}>
              <Form.Item label='Компетенции' name='competence_ids'>
                <Select
                  mode='multiple'
                  placeholder='Выберите компетенции'
                  suffixIcon={<ExperimentOutlined />}
                  optionLabelProp='label'
                  tagRender={({ label, value, onClose }) => {
                    const competence = referenceBooks?.competencies?.find((comp: any) => comp.id === value);
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
                  {referenceBooks?.competencies?.map((competence: any) => (
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
            <Col xs={24} md={24}>
              <Form.Item label='Комментарий' name='comment'>
                <TextArea placeholder='Введите комментарий' rows={3} />
              </Form.Item>
            </Col>
          </Row>

        </Form>
      </div>
    </DetailPageHeader>
  );
}
