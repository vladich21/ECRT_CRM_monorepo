import { TagOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Row, Select } from 'antd';

import type { ContractFormMode, ContractFormRefs } from './contractForm.types';

import layout from '../../create/ContractCreatePage.module.scss';

type Props = {
  mode: ContractFormMode;
  refs: ContractFormRefs;
  requireFullValidation?: boolean;
};

export function ContractFormClassificationFields({ mode, refs, requireFullValidation = false }: Props) {

  return (
    <div className={layout.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <UnorderedListOutlined /> Классификация
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            label='Категория'
            name='category_id'
            rules={requireFullValidation ? [{ required: true, message: 'Выберите категорию' }] : undefined}
          >
            <Select placeholder='Выберите категорию' suffixIcon={<TagOutlined />}>
              {refs.contractCategories?.map(category => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Тип' name='contract_type_id'>
            <Select placeholder='Выберите тип' suffixIcon={<TagOutlined />} optionLabelProp='label' allowClear>
              {refs.contractTypes?.map(type => (
                <Select.Option key={type.id} value={type.id} label={type.name}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
