import { CalculatorOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, InputNumber, Row, Space } from 'antd';

import { MONEY_INPUT_NUMBER_PROPS } from '@/helpers/numberFormatters';

import type { ContractFormMode } from './contractForm.types';

import layout from '../../create/ContractCreatePage.module.scss';

type Props = {
  mode: ContractFormMode;
  onAmountChange: (value: number | null) => void;
  onVatRateChange: (value: number | null) => void;
  requireFullValidation?: boolean;
};

export function ContractFormMoneyFields({
  onAmountChange,
  onVatRateChange,
  requireFullValidation = false,
}: Props) {
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
            rules={requireFullValidation ? [{ required: true, message: 'Введите сумму без НДС' }] : undefined}
          >
            <InputNumber {...MONEY_INPUT_NUMBER_PROPS} onChange={onAmountChange} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Ставка НДС (%)' required={requireFullValidation}>
            <Space.Compact block style={{ width: '100%' }}>
              <Form.Item
                name='vat_rate'
                noStyle
                rules={requireFullValidation ? [{ required: true, message: 'Введите ставку НДС' }] : undefined}
              >
                <InputNumber
                  placeholder='0'
                  style={{ flex: 1, minWidth: 0 }}
                  min={0}
                  max={100}
                  step={1}
                  precision={0}
                  onChange={onVatRateChange}
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
        <Col xs={24}>
          <Form.Item label='Сумма с НДС' name='amount_incl_vat'>
            <InputNumber {...MONEY_INPUT_NUMBER_PROPS} disabled />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
