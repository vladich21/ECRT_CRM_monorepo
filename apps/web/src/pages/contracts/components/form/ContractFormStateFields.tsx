import { CheckCircleOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Row, Select, Switch } from 'antd';

import type { ContractFormMode, ContractFormRefs } from './contractForm.types';

import layout from '../../create/ContractCreatePage.module.scss';

type Props = {
  mode: ContractFormMode;
  refs: ContractFormRefs;
  effectiveByState: boolean;
};

export function ContractFormStateFields({ mode, refs, effectiveByState }: Props) {
  const strict = mode === 'edit';

  return (
    <div className={layout.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <CheckCircleOutlined /> Состояние и статус
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            label='Состояние'
            name='state_id'
            rules={strict ? [{ required: true, message: 'Выберите состояние' }] : undefined}
          >
            <Select
              placeholder={strict ? 'Выберите состояние' : 'Черновик'}
              disabled={!strict}
              style={!strict ? { cursor: 'not-allowed' } : undefined}
            >
              {refs.contractStates?.map(state => (
                <Select.Option key={state.id} value={state.id}>
                  {state.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Статус договора'>
            <Switch
              checkedChildren='Действует'
              unCheckedChildren='Не действует'
              checked={effectiveByState}
              disabled
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
