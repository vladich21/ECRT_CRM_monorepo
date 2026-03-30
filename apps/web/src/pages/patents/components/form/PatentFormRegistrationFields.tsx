import { BankOutlined, CalendarOutlined, NumberOutlined } from '@ant-design/icons';
import { Col, DatePicker, Divider, Form, Input, Row } from 'antd';

import styles from '../../PatentFormPage.module.scss';

export function PatentFormRegistrationFields() {
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
    </div>
  );
}
