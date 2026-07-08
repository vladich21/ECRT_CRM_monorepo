import { useEffect } from 'react';
import { Button, Form, Input, Space } from 'antd';

import type { ModalShellProps } from '@/store/ModalStore';

import { BaseModal, BaseModalProps } from '../BaseModal';

export interface PositionFormModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  type: 'edit' | 'add';
  submitText?: string;
  cancelText?: string;
  onConfirm: (values: { name: string }) => void | Promise<void>;
}

type PositionFormModalData = {
  name?: string;
  nameLabel?: string;
};

export const PositionFormModal: React.FC<ModalShellProps> = ({
  cancelText = 'Отмена',
  onConfirm,
  modalData: rawModalData,
  ...layoutProps
}) => {
  const modalData = (rawModalData ?? {}) as PositionFormModalData;
  const [form] = Form.useForm();
  const nameLabel: string = modalData?.nameLabel ?? 'название должности';

  useEffect(() => {
    if (layoutProps.open) {
      form.setFieldsValue(modalData);
    } else {
      form.setFieldsValue({ name: '' });
    }
  }, [layoutProps.open]);

  const handleFinish = async (values: { name: string }) => {
    await onConfirm(values);
  };

  return (
    <BaseModal
      {...layoutProps}
      footer={null}
      styles={{
        body: { paddingBottom: 0 },
      }}
    >
      <Form form={form} layout='vertical' onFinish={handleFinish} disabled={layoutProps.loading} size='large'>
        <Form.Item
          name='name'
          label='Название'
          rules={[
            { required: true, message: `Введите ${nameLabel}` },
            { min: 2, message: 'Название должно содержать минимум 2 символа' },
            { max: 50, message: 'Название не должно превышать 50 символов' },
          ]}
        >
          <Input
            placeholder={`Введите ${nameLabel}`}
            allowClear
            count={{
              show: true,
              max: 50,
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
          <Space size='middle' style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={layoutProps.onCancel}
              disabled={layoutProps.loading}
              size='large'
              style={{ minWidth: 120 }}
            >
              {cancelText}
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={layoutProps.loading}
              size='large'
              style={{ minWidth: 120 }}
            >
              Сохранить
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </BaseModal>
  );
};
