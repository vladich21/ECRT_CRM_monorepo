import { Form, Input, Select, Row, Col, Divider, DatePicker } from 'antd';
import { FileTextOutlined, NumberOutlined, CalendarOutlined, CopyrightOutlined } from '@ant-design/icons';
import { Reference } from '../../../types/referenceTypes';
import styles from './PatentGrantFormPage.module.scss';

const { Option } = Select;
const { TextArea } = Input;

interface PatentGrantFormFieldsProps {
  form: ReturnType<typeof Form.useForm>[0];
  referenceBooks: { patents?: Reference[] };
  patentIdFromState?: string | null;
}

export function PatentGrantFormFields({
  form,
  referenceBooks,
  patentIdFromState,
}: PatentGrantFormFieldsProps) {
  return (
    <>
      {/* Основная информация и Статус и даты — в один ряд, два столбца */}
      <div className={styles.twoColSections}>
        <div className={styles.sectionBox}>
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <CopyrightOutlined /> Основная информация
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="Номер гранта"
                name="grant_number"
                rules={[{ required: true, message: 'Введите номер гранта' }]}
              >
                <Input placeholder="GR-2024-001" prefix={<NumberOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="РИД" name="patent_id" rules={[{ required: true, message: 'Выберите патент' }]}>
                <Select
                  placeholder="Выберите РИД"
                  allowClear={!patentIdFromState}
                  disabled={!!patentIdFromState}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  suffixIcon={<CopyrightOutlined />}
                >
                  {referenceBooks?.patents?.map((patent: Reference) => (
                    <Option key={patent.id} value={patent.id}>
                      {patent.name || `Патенг ${patent.id}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div className={styles.sectionBox}>
          <Divider orientation="left" style={{ marginTop: 0 }}>
            <CalendarOutlined /> Статус и даты
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Статус" name="status" rules={[{ required: true, message: 'Выберите статус' }]}>
                <Select placeholder="Выберите статус">
                  <Option value="Активный">Активный</Option>
                  <Option value="Истек">Истек</Option>
                  <Option value="Отозван">Отозван</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Дата выдачи гранта" name="grant_date">
                <DatePicker placeholder="Выберите дату выдачи" style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Дата продления" name="renewal_date">
                <DatePicker placeholder="Выберите дату продления" style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Ведомство" name="office">
                <Input placeholder="Введите название ведомства" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </div>

      {/* Дополнительная информация */}
      <Divider orientation="left">
        <FileTextOutlined /> Дополнительная информация
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label="Примечания" name="notes">
            <TextArea placeholder="Введите дополнительные сведения о гранте" rows={3} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
