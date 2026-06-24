import { useEffect } from 'react';
import { Button, Col, Form, FormInstance, Input, Row, Space, Switch } from 'antd';

import { getChangedFields } from '../../../helpers/getChangedFields';
import { ModalState } from '../../../store/ModalStore';
import { BaseModal, BaseModalProps } from '../BaseModal';

export interface PartnerContactFormModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  type: 'edit' | 'add';
  isLoading: boolean;
  submitText?: string;
  cancelText?: string;
  form: FormInstance<any>;
  onConfirm: (values: {
    full_name: string;
    position: string;
    phone: string;
    email: string;
    is_primary: boolean;
  }) => void | Promise<void>;
}

export const PartnerContactFormModal: React.FC<ModalState> = ({
  cancelText = 'Отмена',
  onConfirm,
  modalData,
  ...layoutProps
}) => {
  const [form] = Form.useForm();
  const hasPrimaryContact = modalData?.hasPrimaryContact ?? false;
  const isEdit = !!modalData?.id;

  useEffect(() => {
    if (layoutProps.open && modalData) {
      const { hasPrimaryContact: _, ...values } = modalData;
      form.setFieldsValue(values);
    } else {
      form.resetFields();
    }
  }, [layoutProps.open, modalData]);

  const handleFinish = async (values: {
    full_name: string;
    position: string;
    phone: string;
    email: string;
    is_primary: boolean;
  }) => {
    await onConfirm(modalData ? getChangedFields(values, modalData) : values);
  };

  return (
    <BaseModal
      {...layoutProps}
      footer={null}
      styles={{
        body: { paddingBottom: 0 },
      }}
      width={600}
    >
      <Form form={form} layout='vertical' onFinish={handleFinish} disabled={layoutProps.loading} size='large'>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name='full_name'
              label='ФИО'
              rules={[
                { required: true, message: 'Введите ФИО контакта' },
                { min: 2, message: 'ФИО должно содержать минимум 2 символа' },
                { max: 100, message: 'ФИО не должно превышать 100 символов' },
              ]}
            >
              <Input
                placeholder='Введите ФИО контакта'
                allowClear
                count={{
                  show: true,
                  max: 100,
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='position'
              label='Должность'
              rules={[{ max: 100, message: 'Должность не должна превышать 100 символов' }]}
            >
              <Input
                placeholder='Введите должность'
                allowClear
                count={{
                  show: true,
                  max: 100,
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='phone'
              label='Телефон'
              normalize={v => (typeof v === 'string' ? v.trim() : v)}
              rules={[{ max: 255, message: 'Телефон не должен превышать 255 символов' }]}
            >
              <Input
                placeholder='Введите телефон'
                allowClear
                count={{
                  show: true,
                  max: 255,
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='email'
              label='Email'
              rules={[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Введите корректный email' },
                { max: 128, message: 'Email не должен превышать 128 символов' },
              ]}
            >
              <Input
                placeholder='Введите email'
                allowClear
                count={{
                  show: true,
                  max: 128,
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='is_primary'
              label='Основной контакт'
              valuePropName='checked'
              tooltip={
                hasPrimaryContact && !isEdit
                  ? 'Основной контакт уже существует. Можно создать только дополнительный.'
                  : undefined
              }
            >
              <Switch disabled={hasPrimaryContact && !isEdit} />
            </Form.Item>
          </Col>
        </Row>

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
