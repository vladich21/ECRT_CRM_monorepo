import { ExceptionOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Row, Select, Switch, Typography } from 'antd';

import type { PartnerFormRefs } from './partnerForm.types';

import styles from '../../PartnerFormPage.module.scss';

type Props = {
  refs: PartnerFormRefs;
  disabled?: boolean;
  formMode: 'create' | 'edit';
};

export function PartnerFormClassificationFields({ refs, disabled, formMode }: Props) {
  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <SafetyCertificateOutlined /> Классификация
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label='Категория' name='category_id' rules={[{ required: true, message: 'Выберите категорию' }]}>
            <Select placeholder='Инж. / Рес.'>
              {refs.partnerCategories?.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24}>
          {formMode === 'edit' && (
            <>
              <Typography.Text style={{ display: 'block' }}>Статус архивировать</Typography.Text>
              <Form.Item name='manual_archive' valuePropName='checked'>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' disabled={disabled} />
              </Form.Item>
            </>
          )}
        </Col>
        <Col xs={24}>
          <Form.Item label='Экономическая группа' name='partner_economic_category_id'>
            <Select placeholder='Выберите группу' suffixIcon={<ExceptionOutlined />}>
              {refs.partnerEconomicCategories?.map(category => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Тип контрагента' name='type_ids' rules={[{ required: true, message: 'Выберите тип' }]}>
            <Select mode='multiple' placeholder='Выберите тип' suffixIcon={<SafetyCertificateOutlined />}>
              {refs.partnerTypes?.map(type => (
                <Select.Option key={type.id} value={type.id}>
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
