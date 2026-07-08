import { useState } from 'react';
import { App, Button, Form, Input, Radio, Select, Space } from 'antd';

import { useMakeDecision } from '@/api/approvals/approvalApiHooks';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import { useModalStore, type ModalShellProps } from '@/store/ModalStore';
import type { ApprovalDecisionType, DelegationMode } from '@/types/approval';

import { BaseModal } from '../BaseModal';

function extractError(e: unknown): string | undefined {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

const COMMENT_REQUIRED: ApprovalDecisionType[] = ['rejected', 'returned_to_initiator', 'returned_to_step'];

type ApprovalDecisionModalData = {
  processId: string;
  canDelegate?: boolean;
  canReturnToPrevious?: boolean;
  previousSteps?: { step_order: number; name: string }[];
};

export const ApprovalDecisionModal: React.FC<ModalShellProps> = ({ open, title, modalData: rawModalData }) => {
  const modalData = (rawModalData ?? {}) as ApprovalDecisionModalData;
  const { message } = App.useApp();
  const closeModal = useModalStore(s => s.closeModal);
  const decide = useMakeDecision();

  const [decisionType, setDecisionType] = useState<ApprovalDecisionType>('approved');
  const [comment, setComment] = useState('');
  const [returnToStep, setReturnToStep] = useState<number | undefined>();
  const [delegatedTo, setDelegatedTo] = useState<string | undefined>();
  const [delegationMode, setDelegationMode] = useState<DelegationMode>('transfer');

  const processId: string = modalData?.processId;
  const canDelegate: boolean = modalData?.canDelegate ?? false;
  const canReturnToPrevious: boolean = modalData?.canReturnToPrevious ?? false;
  const previousSteps: { step_order: number; name: string }[] = modalData?.previousSteps ?? [];

  const options = [
    { label: 'Согласовать', value: 'approved' },
    { label: 'Отклонить', value: 'rejected' },
    { label: 'На доработку', value: 'returned_to_initiator' },
    ...(canReturnToPrevious ? [{ label: 'Вернуть на шаг', value: 'returned_to_step' }] : []),
    ...(canDelegate ? [{ label: 'Делегировать', value: 'delegated' }] : []),
  ];

  const needComment = COMMENT_REQUIRED.includes(decisionType);
  const valid =
    (!needComment || comment.trim().length > 0) &&
    (decisionType !== 'returned_to_step' || returnToStep != null) &&
    (decisionType !== 'delegated' || !!delegatedTo);

  const handleClose = () => closeModal();

  const submit = async () => {
    try {
      await decide.mutateAsync({
        processId,
        payload: {
          decision_type: decisionType,
          comment: comment.trim() || undefined,
          return_to_step: decisionType === 'returned_to_step' ? returnToStep : undefined,
          delegated_to: decisionType === 'delegated' ? delegatedTo : undefined,
          delegation_mode: decisionType === 'delegated' ? delegationMode : undefined,
        },
      });
      message.success('Решение сохранено');
      handleClose();
    } catch (e) {
      message.error(extractError(e) ?? 'Не удалось сохранить решение');
    }
  };

  return (
    <BaseModal open={open} title={title} onCancel={handleClose} footer={null} width={520}>
      <Form layout='vertical'>
        <Form.Item label='Решение'>
          <Radio.Group
            optionType='button'
            buttonStyle='solid'
            value={decisionType}
            onChange={e => setDecisionType(e.target.value as ApprovalDecisionType)}
            options={options}
          />
        </Form.Item>

        {decisionType === 'returned_to_step' ? (
          <Form.Item label='Вернуть на шаг' required>
            <Select
              value={returnToStep}
              onChange={setReturnToStep}
              placeholder='Выберите шаг'
              options={previousSteps.map(s => ({ value: s.step_order, label: `${s.step_order}. ${s.name}` }))}
            />
          </Form.Item>
        ) : null}

        {decisionType === 'delegated' ? (
          <>
            <Form.Item label='Делегировать' required>
              <EmployeeSelect value={delegatedTo} onChange={v => setDelegatedTo(v as string)} />
            </Form.Item>
            <Form.Item label='Режим'>
              <Radio.Group value={delegationMode} onChange={e => setDelegationMode(e.target.value as DelegationMode)}>
                <Radio value='transfer'>Передать</Radio>
                <Radio value='add'>Добавить соисполнителя</Radio>
              </Radio.Group>
            </Form.Item>
          </>
        ) : null}

        <Form.Item label='Комментарий' required={needComment}>
          <Input.TextArea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder={needComment ? 'Обязательный комментарий' : 'Необязательно'}
          />
        </Form.Item>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>Отмена</Button>
          <Button type='primary' disabled={!valid} loading={decide.isPending} onClick={submit}>
            Подтвердить
          </Button>
        </Space>
      </Form>
    </BaseModal>
  );
};
