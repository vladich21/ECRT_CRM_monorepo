import { Button, Form, Modal } from 'antd';

import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';

type FormValues = {
  employee_id?: string;
};

type Props = {
  open: boolean;
  confirmLoading?: boolean;
  initialEmployeeId?: string | null;
  onCancel: () => void;
  onConfirm: (employeeId: string) => void;
};

export function PurchaseRequestAssignLeadModal({
  open,
  confirmLoading,
  initialEmployeeId,
  onCancel,
  onConfirm,
}: Props) {
  const [form] = Form.useForm<FormValues>();

  const handleOk = async () => {
    const values = await form.validateFields();
    const employeeId = values.employee_id?.trim();
    if (!employeeId) return;
    onConfirm(employeeId);
  };

  return (
    <Modal
      title={initialEmployeeId ? 'Сменить ведущего ОУП' : 'Назначить ведущего ОУП'}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      afterOpenChange={visible => {
        if (visible) {
          form.setFieldsValue({ employee_id: initialEmployeeId ?? undefined });
        } else {
          form.resetFields();
        }
      }}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Отмена
        </Button>,
        <Button key='ok' type='primary' loading={confirmLoading} onClick={() => void handleOk()}>
          Назначить
        </Button>,
      ]}
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          name='employee_id'
          label='Ведущий ОУП'
          rules={[{ required: true, message: 'Выберите сотрудника' }]}
        >
          <EmployeeSelect placeholder='Сотрудник, который будет вести проработку' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
