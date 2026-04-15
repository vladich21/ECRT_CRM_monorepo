import { FileTextOutlined, GlobalOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, Row, Select } from 'antd';

import { SelectWithQuickAdd } from '@/components/selectWithQuickAdd/SelectWithQuickAdd';
import type { Reference } from '@/types/referenceTypes';

import type { PatentFormRefs } from './patentForm.types';

import styles from '../../PatentFormPage.module.scss';

const { TextArea } = Input;

type Props =
  | { refs: PatentFormRefs; areasField: 'quickAdd'; onOpenAreaModal: () => void }
  | { refs: PatentFormRefs; areasField: 'multi' };

export function PatentFormIdentityFields(props: Props) {
  const { refs, areasField } = props;
  const onOpenAreaModal = props.areasField === 'quickAdd' ? props.onOpenAreaModal : undefined;
  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left'>
        <FileTextOutlined /> Идентификация РИД
      </Divider>

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            label='Наименование РИД'
            name='name'
            rules={[{ required: true, message: 'Введите наименование РИД' }]}
          >
            <TextArea
              placeholder='Введите наименование объекта интеллектуальной собственности'
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label='Объект собственности'
            name='intellectprop_id'
            rules={[{ required: true, message: 'Выберите объект собственности' }]}
          >
            <Select
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите объект'
            >
              {refs.patentIntellectProps?.map(prop => (
                <Select.Option key={prop.id} value={prop.id}>
                  {prop.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label='Статус'
            name='status_id'
            rules={[{ required: true, message: 'Выберите состояние' }]}
          >
            <Select
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите статус'
            >
              {refs.patentStatuses?.map(status => (
                <Select.Option key={status.id} value={status.id}>
                  {status.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label='Области применения' name='area_ids'>
            {areasField === 'quickAdd' && onOpenAreaModal ? (
              <SelectWithQuickAdd
                references={(refs.patentAreas ?? []) as Reference[]}
                addText='Добавить'
                placeholder='Выберите области'
                handleOpenModal={onOpenAreaModal}
              />
            ) : (
              <Select
                mode='multiple'
                showSearch
                maxTagCount='responsive'
                optionFilterProp='children'
                filterOption={(input, option) =>
                  String(option?.children ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                placeholder='Выберите области'
                suffixIcon={<GlobalOutlined />}
              >
                {refs.patentAreas?.map(area => (
                  <Select.Option key={area.id} value={area.id}>
                    {area.name}
                  </Select.Option>
                ))}
              </Select>
            )}
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
