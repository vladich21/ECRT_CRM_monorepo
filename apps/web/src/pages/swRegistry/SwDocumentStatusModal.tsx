import { useEffect } from 'react';
import { Col, DatePicker, Form, Input, Modal, Row, Select } from 'antd';
import dayjs from 'dayjs';

import { useSwDocumentStatuses } from '@/api/swRegistry/swRegistryApiHooks';
import type { ChangeSwDocumentStatusPayload, SwDocumentListRow } from '@/types/swRegistry';
import styles from './SwRegistryModals.module.scss';

type Props = {
  open: boolean;
  document: SwDocumentListRow | null;
  scope: 'document' | 'sheet';
  currentStatusCode: string | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ChangeSwDocumentStatusPayload) => void;
};

export function SwDocumentStatusModal({
  open,
  document,
  scope,
  currentStatusCode,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<ChangeSwDocumentStatusPayload & { placedAt?: dayjs.Dayjs }>();
  const statusesQuery = useSwDocumentStatuses(document?.id, open);
  const statusCode = Form.useWatch('statusCode', form);

  const options = (() => {
    const list = [...(statusesQuery.data?.[scope] ?? [])];
    if (currentStatusCode && !list.some(s => s.code === currentStatusCode)) {
      list.unshift({ code: currentStatusCode, name: currentStatusCode });
    }
    return list.map(s => ({ value: s.code, label: s.name }));
  })();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (currentStatusCode) form.setFieldsValue({ statusCode: currentStatusCode });
  }, [open, document?.id, scope, currentStatusCode, form, statusesQuery.data]);

  const selected = (statusesQuery.data?.[scope] ?? []).find(s => s.code === statusCode);
  const needsIps = selected?.requiresIps === true;

  const handleFinish = (values: ChangeSwDocumentStatusPayload & { placedAt?: dayjs.Dayjs }) => {
    const payload: ChangeSwDocumentStatusPayload = {
      scope,
      statusCode: values.statusCode,
      comment: values.comment,
    };
    if (needsIps && values.ips?.id && values.placedAt) {
      payload.ips = { id: values.ips.id, placedAt: values.placedAt.format('YYYY-MM-DD') };
    }
    onSubmit(payload);
  };

  const scopeLabel = scope === 'sheet' ? 'листа утверждения' : 'документа';

  return (
    <Modal
      title={`Сменить статус ${scopeLabel}`}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading || statusesQuery.isLoading}
      destroyOnHidden
      okText='Применить'
      width={560}
    >
      {document ? (
        <p className={styles.docHeader}>
          {document.designation} — {document.name}
        </p>
      ) : null}
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={handleFinish}>
        <Form.Item name='statusCode' label='Новый статус' rules={[{ required: true, message: 'Выберите статус' }]}>
          <Select options={options} loading={statusesQuery.isLoading} placeholder='Статус' />
        </Form.Item>

        {needsIps ? (
          <Row gutter={12}>
            <Col xs={24} md={14}>
              <Form.Item name={['ips', 'id']} label='Идентификатор в IPS' rules={[{ required: true, message: 'Укажите ID' }]}>
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name='placedAt' label='Дата размещения' rules={[{ required: true, message: 'Укажите дату' }]}>
                <DatePicker format='DD.MM.YYYY' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        ) : null}

        <Form.Item name='comment' label='Комментарий'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
