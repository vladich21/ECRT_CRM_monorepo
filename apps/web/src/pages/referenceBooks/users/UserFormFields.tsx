import { Form, Input, Select, Row, Col, Divider, Switch } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ReferenceData } from '../../../api/hooks/useReferences';
import styles from './UserFormPage.module.scss';
const { Option } = Select;
interface UserFormFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
  referenceBooks: ReferenceData | null;
}
export function UserFormFields({ form, referenceBooks }: UserFormFieldsProps) {
  return (
    <div className={styles.fourColSections}>
      <div className={styles.sectionBox}>
        <Divider orientation='left' style={{ marginTop: 0 }}>
          <UserOutlined /> Основная информация
        </Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label='Имя' name='first_name' rules={[{ required: true, message: 'Введите имя' }]}>
              <Input placeholder='Введите имя' />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label='Фамилия' name='last_name' rules={[{ required: true, message: 'Введите фамилию' }]}>
              <Input placeholder='Введите фамилию' />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label='Отчество' name='middle_name'>
              <Input placeholder='Введите отчество' />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div className={styles.sectionBox}>
        <Divider orientation='left' style={{ marginTop: 0 }}>
          <MailOutlined /> Контактная информация
        </Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              label='Почта'
              name='email'
              rules={[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Введите корректный email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder='email@example.com' type='email' />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label='Моб. телефон'
              name='phone'
              rules={[
                {
                  pattern: /^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
                  message: 'Введите корректный номер телефона',
                },
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder='+7 (999) 999-99-99' />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div className={styles.sectionBox}>
        <Divider orientation='left' style={{ marginTop: 0 }}>
          <TeamOutlined /> Организационная информация
        </Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label='Отдел' name='department_id'>
              <Select
                showSearch
                optionFilterProp='children'
                filterOption={(input, option) =>
                  String(option?.children ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                placeholder='Выберите отдел'
                allowClear
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
          <Col xs={24}>
            <Form.Item label='Должность' name='position_id'>
              <Select
                showSearch
                optionFilterProp='children'
                filterOption={(input, option) =>
                  String(option?.children ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                placeholder='Выберите должность'
                allowClear
                suffixIcon={<IdcardOutlined />}
              >
                {referenceBooks?.positions?.map(position => (
                  <Option key={position.id} value={position.id}>
                    {position.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div className={styles.sectionBox}>
        <Divider orientation='left' style={{ marginTop: 0 }}>
          <SafetyCertificateOutlined /> Права доступа
        </Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label='Роли' name='role_ids'>
              <Select mode='multiple' placeholder='Выберите роли' allowClear suffixIcon={<SafetyCertificateOutlined />}>
                {referenceBooks?.roles?.map(role => (
                  <Option key={role.id} value={role.id}>
                    {(
                      role as {
                        role_name?: string;
                        name?: string;
                      }
                    ).role_name ??
                      (
                        role as {
                          name?: string;
                        }
                      ).name ??
                      role.id}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label='Статус аккаунта' name='is_active' valuePropName='checked'>
              <Switch checkedChildren='Активен' unCheckedChildren='Не активен' />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </div>
  );
}
