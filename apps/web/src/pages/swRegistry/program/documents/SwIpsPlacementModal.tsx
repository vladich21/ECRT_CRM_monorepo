import { useEffect } from 'react';
import { Alert, Col, DatePicker, Form, Input, Modal, Row } from 'antd';
import dayjs from 'dayjs';

import type { ChangeSwDocumentStatusPayload, SwDocumentListRow } from '@/types/swRegistry';

import { formatSwStatusLabel, swStatusBadgeClass } from '../../shared/swStatusBadge';
import styles from './SwIpsPlacementModal.module.scss';

type Props = {
  open: boolean;
  document: SwDocumentListRow | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ChangeSwDocumentStatusPayload) => void;
};

export function SwIpsPlacementModal({ open, document, confirmLoading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<{ ipsId: string; placedAt: dayjs.Dayjs }>();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, form]);

  const handleFinish = (values: { ipsId: string; placedAt: dayjs.Dayjs }) => {
    onSubmit({
      scope: 'document',
      statusCode: 'in_ips',
      ips: { id: values.ipsId.trim(), placedAt: values.placedAt.format('YYYY-MM-DD') },
    });
  };

  return (
    <Modal
      title='Зафиксировать размещение в IPS'
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText='Сохранить'
      width={640}
    >
      <Form form={form} layout='vertical' className={styles.formCompact} onFinish={handleFinish}>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name='ipsId'
              label='Идентификатор записи в IPS'
              rules={[{ required: true, message: 'Укажите идентификатор' }]}
            >
              <Input maxLength={100} placeholder='IPS-4592' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='placedAt' label='Дата размещения' rules={[{ required: true, message: 'Укажите дату' }]}>
              <DatePicker format='DD.MM.YYYY' style={{ width: '100%' }} placeholder='Выберите дату' />
            </Form.Item>
          </Col>
        </Row>
        <Alert
          type='warning'
          showIcon
          className={styles.alert}
          message={
            <>
              После сохранения идентификатор и дата <strong>не изменяются</strong>. Документ и его лист утверждения
              перейдут в финальный статус{' '}
              <span className={swStatusBadgeClass('in_ips', styles)}>
                {formatSwStatusLabel('размещен в IPS', 'in_ips')}
              </span>{' '}
              — переход из него невозможен. Ответственный за ПО получит уведомление.
            </>
          }
        />
      </Form>
    </Modal>
  );
}
