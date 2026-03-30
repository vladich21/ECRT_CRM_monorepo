import { CalendarOutlined } from '@ant-design/icons';
import { Col, DatePicker, Divider, Form, Row } from 'antd';

import type { ContractFormMode } from './contractForm.types';

import layout from '../../create/ContractCreatePage.module.scss';

type Props = {
  mode: ContractFormMode;
};

export function ContractFormDateFields({ mode }: Props) {
  const strict = mode === 'edit';

  return (
    <div className={layout.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <CalendarOutlined /> Сроки действия
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            label='Дата начала'
            name='start_date'
            rules={strict ? [{ required: true, message: 'Выберите дату начала' }] : undefined}
          >
            <DatePicker placeholder='Выберите дату начала' style={{ width: '100%' }} format='DD.MM.YYYY' />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Дата окончания' name='end_date'>
            <DatePicker placeholder='Выберите дату окончания' style={{ width: '100%' }} format='DD.MM.YYYY' />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item
            label='Дата подписания'
            name='date_signed'
            rules={strict ? [{ required: true, message: 'Выберите дату подписания' }] : undefined}
          >
            <DatePicker placeholder='Выберите дату подписания' style={{ width: '100%' }} format='DD.MM.YYYY' />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
