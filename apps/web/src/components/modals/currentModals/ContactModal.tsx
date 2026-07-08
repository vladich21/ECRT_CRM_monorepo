import { useEffect } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Form, FormInstance, Input, Row, Space, Switch } from 'antd';

import { getChangedFields } from '@/helpers/getChangedFields';
import {
  buildContactFormPayload,
  defaultContactPhoneFormRows,
  EMPTY_PARTNER_CONTACT_PHONE,
} from '@/helpers/partnerContactPhoneHelpers';
import type { PartnerContactPhone } from '@/types/partner';
import type { ModalShellProps } from '@/store/ModalStore';

import { BaseModal, BaseModalProps } from '../BaseModal';
import styles from './ContactModal.module.scss';

export interface PartnerContactFormModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  type: 'edit' | 'add';
  isLoading: boolean;
  submitText?: string;
  cancelText?: string;
  form: FormInstance<any>;
  onConfirm: (values: Record<string, unknown>) => void | Promise<void>;
}

type PartnerContactModalData = Record<string, unknown> & {
  id?: string;
  hasPrimaryContact?: boolean;
  phones?: PartnerContactPhone[];
  phone?: string;
  phone_ext?: string;
};

export const PartnerContactFormModal: React.FC<ModalShellProps> = ({
  cancelText = 'Отмена',
  onConfirm,
  modalData: rawModalData,
  ...layoutProps
}) => {
  const modalData = rawModalData as PartnerContactModalData | undefined;
  const [form] = Form.useForm();
  const hasPrimaryContact = modalData?.hasPrimaryContact ?? false;
  const isEdit = !!modalData?.id;

  useEffect(() => {
    if (layoutProps.open && modalData) {
      const { hasPrimaryContact: _, ...values } = modalData;
      form.setFieldsValue({
        ...values,
        phones: defaultContactPhoneFormRows(values.phones, values),
      });
    } else {
      form.resetFields();
    }
  }, [layoutProps.open, modalData, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    const payload = buildContactFormPayload(values);
    const initialPayload = modalData ? buildContactFormPayload({ ...modalData, hasPrimaryContact: undefined }) : null;
    await onConfirm(initialPayload ? getChangedFields(payload, initialPayload) : payload);
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
        </Row>

        <Form.List name='phones' initialValue={[EMPTY_PARTNER_CONTACT_PHONE]}>
          {(fields, { add, remove }) => (
            <div className={styles.phonesBlock}>
              <div className={styles.phonesHeader}>
                <Button
                  type='dashed'
                  htmlType='button'
                  icon={<PlusOutlined />}
                  className={styles.addPhoneButton}
                  onClick={() => add({ ...EMPTY_PARTNER_CONTACT_PHONE })}
                >
                  Добавить номер
                </Button>
              </div>
              <div className={styles.phoneRows}>
                {fields.map(field => (
                  <Row key={field.key} gutter={16} align='middle' wrap={false}>
                    <Col flex='auto'>
                      <Form.Item
                        name={[field.name, 'phone']}
                        label={field.name === 0 ? 'Телефон' : undefined}
                        normalize={value => (typeof value === 'string' ? value.trim() : value)}
                        rules={[{ max: 255, message: 'Телефон не должен превышать 255 символов' }]}
                      >
                        <Input placeholder='Введите телефон' allowClear maxLength={255} />
                      </Form.Item>
                    </Col>
                    <Col flex='140px'>
                      <Form.Item
                        name={[field.name, 'phone_ext']}
                        label={field.name === 0 ? 'Добавочный' : undefined}
                        normalize={value => (typeof value === 'string' ? value.trim() : value)}
                        rules={[{ max: 12, message: 'Добавочный не должен превышать 12 символов' }]}
                      >
                        <Input placeholder='Напр. 123' allowClear maxLength={12} />
                      </Form.Item>
                    </Col>
                    {fields.length > 1 ? (
                      <Col flex='none'>
                        <Button
                          type='text'
                          danger
                          icon={<DeleteOutlined />}
                          aria-label='Удалить номер'
                          onClick={() => remove(field.name)}
                        />
                      </Col>
                    ) : null}
                  </Row>
                ))}
              </div>
            </div>
          )}
        </Form.List>

        <Row gutter={16}>
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
