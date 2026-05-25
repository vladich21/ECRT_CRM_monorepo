import { BankOutlined, CalculatorOutlined, CalendarOutlined, NumberOutlined } from '@ant-design/icons';
import { Col, DatePicker, Divider, Form, Input, InputNumber, Row, Space } from 'antd';

import { numberFormatter, parseThousandSeparatedNumber } from '@/helpers/numberFormatters';

import styles from '../../PatentFormPage.module.scss';

type Props = {
  onRidCostChange: (value: number | null) => void;
  onRidVatRateChange: (value: number | null) => void;
};

export function PatentFormRegistrationFields({ onRidCostChange, onRidVatRateChange }: Props) {
  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left'>
        <BankOutlined /> Регистрационные данные
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label='Номер АО "ИЦ ЖТ"'
            name='registration_number'
            rules={[{ required: true, message: 'Введите номер регистрации' }]}
          >
            <Input placeholder='Внутренний номер' prefix={<NumberOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label='Дата АО "ИЦ ЖТ"'
            name='registration_date'
            rules={[{ required: true, message: 'Выберите дату регистрации' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder='Выберите дату'
              format='DD.MM.YYYY'
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label='Номер заявки' name='application_number'>
            <Input placeholder='Номер патентной заявки' />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label='Номер ЦИР' name='registration_number_cir'>
            <Input placeholder='Номер регистрации в ЦИР' />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label='Дата ЦИР' name='registration_date_cir'>
            <DatePicker
              style={{ width: '100%' }}
              placeholder='Выберите дату'
              format='DD.MM.YYYY'
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label='Номер КД' name='kd_number'>
            <Input placeholder='Номер конструкторской документации' />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation='left' className={styles.sectionSubDivider}>
        <CalculatorOutlined /> Стоимость разработки РИД
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label='Без НДС' name='rid_cost_excl_vat'>
            <InputNumber
              placeholder='0.00'
              style={{ width: '100%' }}
              min={0}
              step={0.01}
              precision={2}
              onChange={onRidCostChange}
              formatter={value => numberFormatter(value)}
              parser={parseThousandSeparatedNumber}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label='НДС (%)'>
            <Space.Compact block style={{ width: '100%' }}>
              <Form.Item name='rid_vat_rate' noStyle>
                <InputNumber
                  placeholder='22'
                  style={{ flex: 1, minWidth: 0 }}
                  min={0}
                  max={100}
                  step={1}
                  precision={0}
                  onChange={onRidVatRateChange}
                />
              </Form.Item>
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
        <Col xs={24} md={8}>
          <Form.Item label='С НДС' name='rid_cost_incl_vat'>
            <InputNumber
              placeholder='0.00'
              style={{ width: '100%' }}
              min={0}
              step={0.01}
              precision={2}
              disabled
              formatter={value => numberFormatter(value)}
              parser={parseThousandSeparatedNumber}
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
