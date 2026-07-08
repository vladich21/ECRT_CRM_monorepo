import { useEffect, useRef } from 'react';
import { Alert, Button, Drawer, Form, Input, Space, Switch } from 'antd';

import type { AdminRole, CreateRolePayload, UpdateRolePayload } from '../../../api/adminRbac/adminRbacApi';
import { transliterateToSlug } from '../../../helpers/transliterate';

interface CreateProps {
  open: boolean;
  role: null;
  onClose: () => void;
  onSubmit: (payload: CreateRolePayload) => void;
  isSubmitting: boolean;
}

interface EditProps {
  open: boolean;
  role: AdminRole;
  onClose: () => void;
  onSubmit: (payload: UpdateRolePayload) => void;
  isSubmitting: boolean;
}

type Props = CreateProps | EditProps;

export function RoleEditDrawer({ open, role, onClose, onSubmit, isSubmitting }: Props) {
  const [form] = Form.useForm<{
    code: string;
    name: string;
    description?: string;
    is_active: boolean;
  }>();

  const isEdit = !!role;
  // Признак ручной правки code: с момента когда пользователь сам ввел что-то
  // в поле code, авто-заполнение из name отключается.
  const codeManuallyEditedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    codeManuallyEditedRef.current = false;
    if (role) {
      form.setFieldsValue({
        code: role.code,
        name: role.name,
        description: role.description,
        is_active: role.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true });
    }
  }, [open, role, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEdit) return; // на редактировании code заблокирован
    if (codeManuallyEditedRef.current) return;
    const slug = transliterateToSlug(e.target.value);
    form.setFieldValue('code', slug);
  };

  const handleCodeChange = () => {
    codeManuallyEditedRef.current = true;
  };

  const handleFinish = (values: { code: string; name: string; description?: string; is_active: boolean }) => {
    if (role) {
      // На update code менять не разрешаем
      (onSubmit as (p: UpdateRolePayload) => void)({
        name: values.name,
        description: values.description,
        is_active: values.is_active,
      });
    } else {
      (onSubmit as (p: CreateRolePayload) => void)(values);
    }
  };

  return (
    <Drawer
      title={isEdit ? `Редактировать роль «${role!.name}»` : 'Новая роль'}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type='primary'
            loading={isSubmitting}
            onClick={() => form.submit()}
          >
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </Space>
      }
    >
      {role?.is_system && (
        <Alert
          type='warning'
          showIcon
          message='Системная роль'
          description='Эта роль защищена системой. Удалить и деактивировать ее нельзя - изменения возможны только для названия и описания.'
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout='vertical' onFinish={handleFinish}>
        <Form.Item
          label='Название'
          name='name'
          rules={[{ required: true, message: 'Название обязательно' }]}
        >
          <Input placeholder='Закупщик' onChange={handleNameChange} />
        </Form.Item>

        <Form.Item
          label='Код'
          name='code'
          rules={[
            { required: true, message: 'Код обязателен' },
            {
              pattern: /^[a-z][a-z0-9_]*$/,
              message: 'Только строчные буквы, цифры и подчеркивание; начинается с буквы',
            },
          ]}
          extra={
            isEdit
              ? 'Используется в коде для проверок прав. После создания не меняется.'
              : 'Заполняется автоматически из названия (транслит). Можно поправить вручную.'
          }
        >
          <Input
            disabled={isEdit}
            placeholder='например: procurement_manager'
            onChange={handleCodeChange}
          />
        </Form.Item>

        <Form.Item label='Описание' name='description'>
          <Input.TextArea rows={3} placeholder='Что делает эта роль' />
        </Form.Item>

        <Form.Item label='Активна' name='is_active' valuePropName='checked'>
          <Switch disabled={role?.is_system} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
