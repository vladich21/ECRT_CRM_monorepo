import { Button, Form, Input, Space } from 'antd';
import { BaseModal, BaseModalProps } from '../BaseModal';
import { useEffect } from 'react';
import { ModalState } from '../../../store/ModalStore';

export interface PositionFormModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  type: 'edit' | 'add';
  submitText?: string;
  cancelText?: string;
  onConfirm: (values: { name: string }) => void | Promise<void>;
}

export const PositionFormModal: React.FC<ModalState> = ({
  cancelText = 'Отмена',
  onConfirm,
  modalData,
  ...layoutProps
}) => {
  const [form] = Form.useForm();

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
          label='Название должности'
          rules={[
            { required: true, message: 'Введите название должности' },
            { min: 2, message: 'Название должно содержать минимум 2 символа' },
            { max: 50, message: 'Название не должно превышать 50 символов' },
          ]}
        >
          <Input
            placeholder='Введите название должности'
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
