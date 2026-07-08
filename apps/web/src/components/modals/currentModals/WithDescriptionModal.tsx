import { useEffect } from 'react';
import { Button, Form, Input, Space } from 'antd';
import TextArea from 'antd/es/input/TextArea';

import type { ModalShellProps } from '@/store/ModalStore';

import { BaseModal, BaseModalProps } from '../BaseModal';

export interface PositionFormModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  type: 'edit' | 'add';
  submitText?: string;
  cancelText?: string;
  onConfirm: (values: { name: string }) => void | Promise<void>;
}

type WithDescriptionFormModalData = {
  name?: string;
  description?: string;
  code?: string;
  nameLabel?: string;
  showCode?: boolean;
};

export const WithDescriptionFormModal: React.FC<ModalShellProps> = ({
  cancelText = 'Отмена',
  onConfirm,
  modalData: rawModalData,
  ...layoutProps
}) => {
  const modalData = (rawModalData ?? {}) as WithDescriptionFormModalData;
  const [form] = Form.useForm();
  const nameLabel: string = modalData.nameLabel ?? 'название';
  const showCode: boolean = modalData.showCode ?? false;

  useEffect(() => {
    if (layoutProps.open) {
      form.setFieldsValue(modalData);
    } else {
      form.setFieldsValue({ name: '', description: '', code: '' });
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

        {showCode && (
          <Form.Item label='Код' name='code'>
            <Input placeholder='Введите код' allowClear />
          </Form.Item>
        )}

        <Form.Item label='Описание' name='description'>
          <TextArea placeholder='Введите описание' allowClear rows={3} />
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
