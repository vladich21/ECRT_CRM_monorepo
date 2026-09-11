import { Button, Form, Input, Modal } from 'antd';

import { IncomeContractStageFields } from './IncomeContractStageFields';
import { useIncomeContractOptions } from './useIncomeContractOptions';

type FormValues = {
  income_contract_id?: string;
  income_stage_id?: string;
  comment?: string;
};

type Props = {
  open: boolean;
  confirmLoading?: boolean;
  initialContractId?: string | null;
  initialStageId?: string | null;
  onCancel: () => void;
  onConfirm: (payload: { contractId: string | null; stageId: string | null; comment?: string }) => void;
};

export function PurchaseRequestChangeIncomeModal({
  open,
  confirmLoading,
  initialContractId,
  initialStageId,
  onCancel,
  onConfirm,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const { contracts, isLoading } = useIncomeContractOptions(initialContractId);

  const handleOk = async () => {
    const values = await form.validateFields();
    const contractId = values.income_contract_id?.trim() || null;
    onConfirm({
      contractId,
      stageId: contractId ? values.income_stage_id?.trim() || null : null,
      comment: values.comment?.trim() || undefined,
    });
  };

  return (
    <Modal
      title='Сменить доходный договор'
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      afterOpenChange={visible => {
        if (visible) {
          form.setFieldsValue({
            income_contract_id: initialContractId ?? undefined,
            income_stage_id: initialStageId ?? undefined,
            comment: undefined,
          });
        } else {
          form.resetFields();
        }
      }}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Отмена
        </Button>,
        <Button key='ok' type='primary' loading={confirmLoading} onClick={() => void handleOk()}>
          Сохранить
        </Button>,
      ]}
    >
      <Form form={form} layout='vertical'>
        <IncomeContractStageFields contracts={contracts} contractsLoading={isLoading} />
        <Form.Item name='comment' label='Комментарий'>
          <Input.TextArea rows={3} maxLength={2000} placeholder='Необязательно до служебной корректировки' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
