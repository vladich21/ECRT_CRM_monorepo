import { ClockCircleOutlined } from '@ant-design/icons';
import { App, Badge, Button, Card, Empty, Popconfirm, Space, Spin, Steps, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';

import { useApprovalState, useCancelProcess, useResubmitProcess } from '@/api/approvals/approvalApiHooks';
import { useModalStore } from '@/store/ModalStore';
import {
  APPROVAL_STATUS_LABELS,
  DECISION_LABELS,
  type ApprovalProcessStatus,
  type ApprovalStepView,
} from '@/types/approval';

type BadgeStatus = 'success' | 'processing' | 'error' | 'warning' | 'default';

const STATUS_BADGE: Record<ApprovalProcessStatus, BadgeStatus> = {
  active: 'processing',
  revision: 'warning',
  approved: 'success',
  ratified: 'success',
  rejected: 'error',
  cancelled: 'default',
  returned: 'warning',
};

interface ApprovalPanelProps {
  entityType: string;
  entityId?: string;
  variant?: 'card' | 'compact';
}

export function ApprovalPanel({ entityType, entityId: entityIdProp, variant = 'card' }: ApprovalPanelProps) {
  const params = useParams();
  const entityId = entityIdProp ?? (params[`${entityType}Id`] as string | undefined);
  const { message } = App.useApp();
  const openModal = useModalStore((s) => s.openModal);

  const { data: state, isLoading } = useApprovalState(entityType, entityId);
  const cancel = useCancelProcess();
  const resubmit = useResubmitProcess();

  if (!entityId) return null;
  if (isLoading || !state) return <Spin />;

  const process = state.process;

  const openStart = () =>
    openModal({
      type: 'approvalStart',
      title: 'Отправить на согласование',
      modalData: { entityType, entityId, availableRoutes: state.available_routes },
      onConfirm: () => {},
      onCancel: () => {},
    });

  const openDecision = () => {
    if (!process) return;
    const current = process.steps.find((s) => s.step_order === process.current_step_order);
    const previousSteps = process.steps
      .filter((s) => s.step_order < process.current_step_order)
      .map((s) => ({ step_order: s.step_order, name: s.name }));
    openModal({
      type: 'approvalDecision',
      title: 'Принятие решения',
      modalData: {
        processId: process.id,
        currentStepOrder: process.current_step_order,
        canDelegate: current?.can_delegate ?? false,
        canReturnToPrevious: current?.can_return_to_previous ?? false,
        previousSteps,
      },
      onConfirm: () => {},
      onCancel: () => {},
    });
  };

  const content = (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {process && (
        <>
          <Space wrap>
            <Badge status={STATUS_BADGE[process.status] ?? 'default'} text={APPROVAL_STATUS_LABELS[process.status]} />
            {process.route_name ? <Typography.Text type="secondary">{process.route_name}</Typography.Text> : null}
          </Space>

          {process.completion_comment && (process.status === 'revision' || process.status === 'rejected') ? (
            <Typography.Text type={process.status === 'rejected' ? 'danger' : 'warning'}>
              Комментарий: {process.completion_comment}
            </Typography.Text>
          ) : null}

          <Steps direction="vertical" size="small" items={process.steps.map(stepToItem)} />

          <Space wrap>
            {state.can_approve && (
              <Button type="primary" onClick={openDecision}>
                Принять решение
              </Button>
            )}
            {state.can_resubmit && (
              <Popconfirm
                title="Отправить документ повторно на согласование?"
                onConfirm={async () => {
                  await resubmit.mutateAsync({ processId: process.id });
                  message.success('Отправлено повторно');
                }}
              >
                <Button loading={resubmit.isPending}>Отправить повторно</Button>
              </Popconfirm>
            )}
            {state.can_cancel && (
              <Popconfirm
                title="Отменить согласование?"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  await cancel.mutateAsync({ processId: process.id });
                  message.success('Согласование отменено');
                }}
              >
                <Button danger loading={cancel.isPending}>
                  Отменить
                </Button>
              </Popconfirm>
            )}
          </Space>

          {process.decisions.length > 0 && (
            <Card size="small" title="Лист согласования">
              <Space direction="vertical" style={{ width: '100%' }}>
                {process.decisions.map((d) => (
                  <div key={d.id}>
                    <Typography.Text strong>{d.decided_by_name}</Typography.Text>{' — '}
                    <Tag>{DECISION_LABELS[d.decision_type]}</Tag>
                    {d.delegated_to_name ? <Typography.Text> → {d.delegated_to_name}</Typography.Text> : null}
                    <Typography.Text type="secondary"> · {new Date(d.decided_at).toLocaleString('ru-RU')}</Typography.Text>
                    {d.comment ? (
                      <div>
                        <Typography.Text type="secondary">{d.comment}</Typography.Text>
                      </div>
                    ) : null}
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </>
      )}

      {state.can_start_approval ? (
        state.available_routes.length ? (
          <Button type="primary" onClick={openStart}>
            Отправить на согласование
          </Button>
        ) : (
          <Typography.Text type="secondary">Нет доступных маршрутов согласования</Typography.Text>
        )
      ) : null}

      {!process && !state.can_start_approval ? (
        <Empty description="Согласование не запущено" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : null}
    </Space>
  );

  if (variant === 'compact') return content;
  return <Card title="Согласование">{content}</Card>;
}

function stepToItem(step: ApprovalStepView) {
  const status = step.state === 'completed' ? 'finish' : step.state === 'current' ? 'process' : 'wait';
  return {
    status: status as 'finish' | 'process' | 'wait',
    title: (
      <Space size={4} wrap>
        <span>{step.name}</span>
        {step.step_role_name ? <Tag color={step.step_role_color ?? undefined}>{step.step_role_name}</Tag> : null}
        {step.is_overdue ? (
          <Tag icon={<ClockCircleOutlined />} color="red">
            Просрочено
          </Tag>
        ) : null}
      </Space>
    ),
    description: <StepDescription step={step} />,
  };
}

function StepDescription({ step }: { step: ApprovalStepView }) {
  return (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      {step.step_type === 'sequential' && step.sequential_queue?.length ? (
        <div>
          {step.sequential_queue.map((q, i) => (
            <Tag key={q.id} color={q.state === 'done' ? 'green' : q.state === 'active' ? 'blue' : 'default'}>
              {i + 1}. {q.name}
            </Tag>
          ))}
        </div>
      ) : (
        <div>
          {step.assignees.map((a) => (
            <Tag key={a.assignee_id} color={!a.is_pending ? 'green' : a.is_active ? 'blue' : 'default'}>
              {a.name}
              {!a.is_pending ? ' ✓' : ''}
            </Tag>
          ))}
        </div>
      )}
      {step.deadline_at && step.state === 'current' ? (
        <Typography.Text type={step.is_overdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
          Срок: {new Date(step.deadline_at).toLocaleString('ru-RU')}
        </Typography.Text>
      ) : null}
    </Space>
  );
}
