import {
  BankOutlined,
  CloudDownloadOutlined,
  EnvironmentOutlined,
  ExceptionOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Row, Select, Space, Switch, Tag, Tooltip, Typography } from 'antd';

import { PartnerCompetence } from '../../types/partner';
import styles from './PartnerFormPage.module.scss';

const { Option } = Select;
const { TextArea } = Input;
interface PartnerFormFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
  referenceBooks: {
    partnerCategories?: {
      id: string;
      name: string;
    }[];
    partnerTypes?: {
      id: string;
      name: string;
    }[];
    partnerStatuses?: {
      id: string;
      name: string;
    }[];
    competencies?: PartnerCompetence[];
    partnerEconomicCategories?: {
      id: string;
      name: string;
    }[];
  };
  disabled?: boolean;
  getFieldStatus?: (fieldName: string) => 'error' | undefined;
  onUploadByInn?: () => void;
  isLoadingInn?: boolean;
  formMode?: 'create' | 'edit';
  /** Только для edit: текущее наименование статуса с сервера */
  statusDisplayName?: string;
}
export function PartnerFormFields({
  form,
  referenceBooks,
  disabled,
  getFieldStatus = () => undefined,
  onUploadByInn,
  isLoadingInn,
  formMode = 'create',
  statusDisplayName,
}: PartnerFormFieldsProps) {
  return (
    <>
      <Divider orientation='left'>
        <BankOutlined /> Реквизиты и идентификация
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={4}>
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
                <Input
                  placeholder='Введите ИНН'
                  prefix={<BankOutlined />}
                  className={styles.innInput}
                  status={getFieldStatus('inn')}
                />
              </Form.Item>
              {onUploadByInn && (
                <Tooltip title='Загрузить данные компании по ИНН'>
                  <Button
                    type='primary'
                    icon={<CloudDownloadOutlined />}
                    onClick={onUploadByInn}
                    loading={isLoadingInn}
                  />
                </Tooltip>
              )}
            </Space.Compact>
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
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

        <Col xs={24} md={4}>
          <Form.Item
            label='ОГРН'
            name='ogrn'
            validateStatus={getFieldStatus('ogrn')}
            rules={[{ pattern: /^$|^\d{13}$|^\d{15}$/, message: 'ОГРН должен содержать 13 или 15 цифр' }]}
          >
            <Input placeholder='Введите ОГРН' prefix={<BankOutlined />} status={getFieldStatus('ogrn')} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label='Полное наименование'
            name='name'
            rules={[{ required: true, message: 'Введите полное наименование' }]}
          >
            <Input placeholder='Введите полное наименование' prefix={<IdcardOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
          <Form.Item label='Краткое наименование' name='short_name'>
            <Input placeholder='Введите краткое наименование' prefix={<IdcardOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <div className={styles.threeColSections}>
        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <SafetyCertificateOutlined /> Классификация
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label='Категория'
                name='category_id'
                rules={[{ required: true, message: 'Выберите категорию' }]}
              >
                <Select placeholder='Инж. / Рес.'>
                  {referenceBooks.partnerCategories?.map(cat => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              {formMode === 'edit' && (
                <>
                  <Typography.Text style={{ display: 'block' }}>
                    Статус архивировать
                  </Typography.Text>
                 
                  <Form.Item name='manual_archive' valuePropName='checked'>
                    <Switch checkedChildren='Да' unCheckedChildren='Нет' disabled={disabled} />
                  </Form.Item>
                </>
              )}
            </Col>
            <Col xs={24}>
              <Form.Item label='Экономическая группа' name='partner_economic_category_id'>
                <Select placeholder='Выберите группу' suffixIcon={<ExceptionOutlined />}>
                  {referenceBooks.partnerEconomicCategories?.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Тип контрагента' name='type_ids' rules={[{ required: true, message: 'Выберите тип' }]}>
                <Select mode='multiple' placeholder='Выберите тип' suffixIcon={<SafetyCertificateOutlined />}>
                  {referenceBooks.partnerTypes?.map(type => (
                    <Option key={type.id} value={type.id}>
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
            <IdcardOutlined /> Флаги
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Ключевой поставщик' name='is_key_supplier' valuePropName='checked'>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Целевой поставщик' name='is_targeted' valuePropName='checked'>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Юр. проверка' name='legal_check_passed' valuePropName='checked'>
                <Switch checkedChildren='Пройдена' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Первичная оценка' name='initial_assessment_done' valuePropName='checked'>
                <Switch checkedChildren='Выполнена' unCheckedChildren='Нет' />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <EnvironmentOutlined /> Контакты и адреса
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label='Телефон'
                name='phone'
                rules={[
                  {
                    pattern: /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
                    message: 'Введите корректный номер телефона',
                  },
                ]}
              >
                <Input placeholder='Введите телефон' prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Email' name='email' rules={[{ type: 'email', message: 'Введите корректный email' }]}>
                <Input placeholder='Введите email' prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Сайт' name='website'>
                <Input placeholder='Введите сайт' prefix={<GlobalOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Юридический адрес' name='legal_address'>
                <Input placeholder='Введите юридический адрес' prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Фактический адрес' name='actual_address'>
                <Input placeholder='Введите фактический адрес' prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <ExperimentOutlined /> Дополнительно
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Компетенции' name='competence_ids'>
                <Select
                  mode='multiple'
                  showSearch
                  optionFilterProp='label'
                  filterOption={(searchText, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(searchText.trim().toLowerCase())
                  }
                  placeholder='Начните вводить название компетенции'
                  suffixIcon={<ExperimentOutlined />}
                  optionLabelProp='label'
                  tagRender={({ label, onClose }) => (
                    <Tag onClose={onClose} closable bordered={false} className={styles.competenceTag}>
                      {label}
                    </Tag>
                  )}
                >
                  {referenceBooks.competencies?.map((competence: PartnerCompetence) => (
                    <Option key={competence.id} value={competence.id} label={competence.name}>
                      <div className={styles.competenceOptionContainer}>
                        <span className={styles.competenceOptionLabel}>{competence.name}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Комментарий' name='comment'>
                <TextArea placeholder='Введите комментарий' rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </div>
    </>
  );
}
