import { EnvironmentOutlined, GlobalOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, Row } from 'antd';

import styles from '../../PartnerFormPage.module.scss';

export function PartnerFormContactFields() {
  return (
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
  );
}
