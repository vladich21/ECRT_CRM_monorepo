import { useEffect } from 'react';
import { Button, Form, Input, Space } from 'antd';
import TextArea from 'antd/es/input/TextArea';

import { ModalState } from '../../../store/ModalStore';
import { BaseModal, BaseModalProps } from '../BaseModal';

export interface PatentFormModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  type: 'edit' | 'add';
  submitText?: string;
  cancelText?: string;
  onConfirm: (values: { name: string }) => void | Promise<void>;
}

export const PatentAreasFormModal: React.FC<ModalState> = ({
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
        <Form.Item name='name' label='Название области завки'>
          <Input
            placeholder='Введите название области завки'
            allowClear
            count={{
              show: true,
              max: 50,
            }}
          />
        </Form.Item>

        <Form.Item label='Описание' name='description'>
          <TextArea placeholder='Введите комментарий' allowClear rows={3} />
        </Form.Item>

        <Form.Item name='code' label='Код области'>
          <Input
            placeholder='Введите код области завки'
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
