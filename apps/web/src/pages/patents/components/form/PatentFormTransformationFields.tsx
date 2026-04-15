import { SwapOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, Row, Select } from 'antd';

import { patentRidWorkflowKind } from '@/constants/patentRidWorkflowKind';
import { getNameById } from '@/helpers/getNameById';

import type { PatentFormRefs } from './patentForm.types';

import styles from '../../PatentFormPage.module.scss';

type Props = {
  refs: PatentFormRefs;
  targetPatentOptions: { value: string; label: string }[];
  targetPatentOptionsLoading?: boolean;
};

export function PatentFormTransformationFields({
  refs,
  targetPatentOptions,
  targetPatentOptionsLoading,
}: Props) {
  const form = Form.useFormInstance();
  const statusId = Form.useWatch('status_id', form);
  const statusName = getNameById(statusId, refs.patentStatuses);
  const show = patentRidWorkflowKind(statusName) === 'transformation';

  if (!show) {
    return null;
  }

  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left'>
        <SwapOutlined /> Преобразование РИД
      </Divider>
      <p className={styles.transformationIntro}>
        Укажите РИД, в который оформляется преобразование, и номера уведомлений ИЦ ЖТ и ЦИР.
      </p>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item
            name='transformed_into_patent_id'
            label='Целевой РИД'
            rules={[{ required: true, message: 'Выберите целевой РИД из реестра' }]}
          >
            <Select
              showSearch
              allowClear
              loading={targetPatentOptionsLoading}
              optionFilterProp='label'
              options={targetPatentOptions}
              placeholder='Выберите запись из реестра'
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name='transformation_notification_ic_zht'
            label='Номер уведомления ИЦ ЖТ'
            rules={[{ required: true, message: 'Укажите номер уведомления ИЦ ЖТ' }]}
          >
            <Input maxLength={255} placeholder='Номер уведомления' />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name='transformation_notification_cir'
            label='Номер уведомления ЦИР'
            rules={[{ required: true, message: 'Укажите номер уведомления ЦИР' }]}
          >
            <Input maxLength={255} placeholder='Номер уведомления' />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
