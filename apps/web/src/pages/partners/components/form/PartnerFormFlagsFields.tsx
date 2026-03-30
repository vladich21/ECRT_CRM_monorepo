import { IdcardOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Row, Switch } from 'antd';

import styles from '../../PartnerFormPage.module.scss';

export function PartnerFormFlagsFields() {
  return (
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
  );
}
