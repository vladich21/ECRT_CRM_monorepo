import { CalculatorOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, InputNumber, Row, Space } from 'antd';

import { numberFormatter, parseThousandSeparatedNumber } from '../../../../helpers/numberFormatters';

import type { ContractFormMode } from './contractForm.types';

import layout from '../../create/ContractCreatePage.module.scss';

type Props = {
  mode: ContractFormMode;
  onAmountChange: (value: number | null) => void;
  onVatRateChange: (value: number | null) => void;
};

export function ContractFormMoneyFields({ mode, onAmountChange, onVatRateChange }: Props) {
  const strict = mode === 'edit';

  return (
    <div className={layout.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <CalculatorOutlined /> Финансовые условия
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            label='Сумма без НДС'
            name='amount_excl_vat'
            rules={strict ? [{ required: true, message: 'Введите сумму без НДС' }] : undefined}
          >
            <InputNumber
              placeholder='0.00'
              style={{ width: '100%' }}
              min={0}
              step={0.01}
              precision={2}
              onChange={onAmountChange}
              formatter={value => numberFormatter(value)}
              parser={parseThousandSeparatedNumber}
            />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item
            label='Ставка НДС (%)'
            name='vat_rate'
            rules={strict ? [{ required: true, message: 'Введите ставку НДС' }] : undefined}
          >
            <Space.Compact block style={{ width: '100%' }}>
              <InputNumber
                placeholder='0'
                style={{ flex: 1, minWidth: 0 }}
                min={0}
                max={100}
                step={1}
                precision={0}
                onChange={onVatRateChange}
              />
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
        <Col xs={24}>
          <Form.Item label='Сумма с НДС' name='amount_incl_vat'>
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
