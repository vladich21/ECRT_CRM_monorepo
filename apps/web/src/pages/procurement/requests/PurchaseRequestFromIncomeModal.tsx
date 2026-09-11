import { Button, Form, Modal } from 'antd';

import { IncomeContractStageFields } from './IncomeContractStageFields';
import { useIncomeContractOptions } from './useIncomeContractOptions';

type FormValues = {
  income_contract_id: string;
  income_stage_id?: string;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (payload: { contractId: string; stageId?: string }) => void;
};

export function PurchaseRequestFromIncomeModal({ open, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { contracts, isLoading } = useIncomeContractOptions();

  const handleOk = async () => {
    const values = await form.validateFields();
    onConfirm({
      contractId: values.income_contract_id,
      stageId: values.income_stage_id || undefined,
    });
  };

  return (
    <Modal
      title='Создать на основании доходного'
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      afterOpenChange={visible => {
        if (!visible) form.resetFields();
      }}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Отмена
        </Button>,
        <Button key='ok' type='primary' onClick={() => void handleOk()}>
          Продолжить
        </Button>,
      ]}
    >
      <Form form={form} layout='vertical'>
        <IncomeContractStageFields contracts={contracts} contractsLoading={isLoading} contractRequired />
      </Form>
    </Modal>
  );
}
