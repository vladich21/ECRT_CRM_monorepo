import { CalendarOutlined, CopyrightOutlined, FileTextOutlined, NumberOutlined } from '@ant-design/icons';
import { Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { useMemo } from 'react';

import { PATENT_GRANT_OFFICE_OPTIONS } from '../../../../api/patents/patentGrantRegions';
import { Reference } from '../../../../types/referenceTypes';
import styles from '../PatentGrantFormPage.module.scss';

const { TextArea } = Input;

function buildOfficeSelectOptions(savedOffice?: string | null) {
  const opts = [...PATENT_GRANT_OFFICE_OPTIONS];
  const t = savedOffice?.trim();
  if (t && !opts.some(o => o.value === t)) {
    opts.unshift({ value: t, label: `${t} (текущее в записи)` });
  }
  return opts;
}

interface PatentGrantFormFieldsProps {
  referenceBooks: {
    patents?: Reference[];
  };
  patentIdFromState?: string | null;
  savedOfficeForLegacy?: string | null;
}
export function PatentGrantFormFields({
  referenceBooks,
  patentIdFromState,
  savedOfficeForLegacy,
}: PatentGrantFormFieldsProps) {
  const officeOptions = useMemo(() => buildOfficeSelectOptions(savedOfficeForLegacy), [savedOfficeForLegacy]);
  return (
    <>
      <div className={styles.twoColSections}>
        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <CopyrightOutlined /> Основная информация
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label='Номер охранного документа'
                name='grant_number'
                rules={[{ required: true, message: 'Введите номер охранного документа' }]}
              >
                <Input placeholder='GR-2024-001' prefix={<NumberOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='РИД' name='patent_id' rules={[{ required: true, message: 'Выберите патент' }]}>
                <Select
                  placeholder='Выберите РИД'
                  allowClear={!patentIdFromState}
                  disabled={!!patentIdFromState}
                  showSearch
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    String(option?.children ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  suffixIcon={<CopyrightOutlined />}
                >
                  {referenceBooks?.patents?.map((patent: Reference) => (
                    <Select.Option key={patent.id} value={patent.id}>
                      {patent.name || `Патенг ${patent.id}`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <CalendarOutlined /> Статус и даты
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label='Статус' name='status' rules={[{ required: true, message: 'Выберите статус' }]}>
                <Select placeholder='Выберите статус'>
                  <Select.Option value='Активный'>Активный</Select.Option>
                  <Select.Option value='Неактивный'>Неактивный</Select.Option>
                  <Select.Option value='Истек'>Истек</Select.Option>
                  <Select.Option value='Отозван'>Отозван</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Дата выдачи' name='grant_date'>
                <DatePicker placeholder='Выберите дату выдачи' style={{ width: '100%' }} format='DD.MM.YYYY' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Дата продления' name='renewal_date'>
                <DatePicker placeholder='Выберите дату продления' style={{ width: '100%' }} format='DD.MM.YYYY' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='Ведомство' name='office'>
                <Select
                  placeholder='Выберите ведомство'
                  allowClear
                  showSearch
                  optionFilterProp='label'
                  options={officeOptions}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </div>

      <Divider orientation='left'>
        <FileTextOutlined /> Дополнительная информация
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label='Примечания' name='notes'>
            <TextArea placeholder='Введите дополнительные сведения о охранном документе' rows={3} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
