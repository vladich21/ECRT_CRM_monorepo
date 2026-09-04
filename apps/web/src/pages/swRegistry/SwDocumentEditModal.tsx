import { useEffect } from 'react';
import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';

import type { SwDocumentDetail, UpdateSwDocumentPayload } from '@/types/swRegistry';
import styles from './SwRegistryModals.module.scss';

const LETTER_OPTIONS = ['О', 'О₁', 'О₂', 'А', 'Б', 'В'].map(value => ({ value, label: value }));

interface Props {
  open: boolean;
  document: SwDocumentDetail | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: UpdateSwDocumentPayload) => void;
}

export function SwDocumentEditModal({ open, document, confirmLoading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<UpdateSwDocumentPayload>();

  useEffect(() => {
    if (!open || !document) return;
    form.setFieldsValue({
      name: document.name,
      sheetsCount: document.sheetsCount,
      letter: document.letter ?? undefined,
    });
  }, [open, document, form]);

  return (
    <Modal
      title='Изменить документ'
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Сохранить'
      width={640}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={onSubmit}>
        <Form.Item label='Обозначение'>
          <Input value={document?.designation} readOnly />
        </Form.Item>

        <Form.Item
          name='name'
          label='Наименование'
          rules={[{ required: true, message: 'Укажите наименование' }]}
          extra={
            document?.approvalSheet
              ? 'Наименование листа утверждения выводится из наименования документа (ДОК-11)'
              : undefined
          }
        >
          <Input maxLength={500} />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name='sheetsCount'
              label='Количество листов'
              rules={[{ required: true, message: 'Укажите количество листов' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='letter' label='Литера'>
              <Select allowClear options={LETTER_OPTIONS} placeholder='Не выбрана' />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
