import { ClockCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { App, Badge, Button, Card, Col, Empty, Modal, Popconfirm, Row, Space, Spin, Steps, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useApprovalState, useCancelProcess, useResubmitProcess } from '@/api/approvals/approvalApiHooks';
import { useModalStore } from '@/store/ModalStore';
import {
  APPROVAL_STATUS_LABELS,
  DECISION_LABELS,
  type ApprovalProcessStatus,
  type ApprovalStepView,
} from '@/types/approval';

import { ApprovalDocuments } from './ApprovalDocuments';
import { ApprovalFeed } from './ApprovalFeed';

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

function stepStatus(s: ApprovalStepView): 'finish' | 'process' | 'wait' | 'error' {
  if (s.state === 'completed') return 'finish';
  if (s.state === 'current') return s.is_overdue ? 'error' : 'process';
  return 'wait';
}

function StepAssignees({ step }: { step: ApprovalStepView }) {
  if (step.step_type === 'sequential' && step.sequential_queue?.length) {
    return (
      <div>
        {step.sequential_queue.map((q, i) => (
          <Tag key={q.id} color={q.state === 'done' ? 'green' : q.state === 'active' ? 'blue' : 'default'}>
            {i + 1}. {q.name}
          </Tag>
        ))}
      </div>
    );
  }
  return (
    <div>
      {step.assignees.map((a) => (
        <Tag key={a.assignee_id} color={!a.is_pending ? 'green' : a.is_active ? 'blue' : 'default'}>
          {a.name}
          {!a.is_pending ? ' ✓' : ''}
        </Tag>
      ))}
    </div>
  );
}

export function ApprovalPanel({ entityType, entityId: entityIdProp, variant = 'card' }: ApprovalPanelProps) {
  const params = useParams();
  const entityId = entityIdProp ?? (params[`${entityType}Id`] as string | undefined);
  const { message } = App.useApp();
  const openModal = useModalStore((s) => s.openModal);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: state, isLoading } = useApprovalState(entityType, entityId);
  const cancel = useCancelProcess();
  const resubmit = useResubmitProcess();

  if (!entityId) return null;
  if (isLoading || !state) return <Spin />;

  const process = state.process;
  // Документы и обсуждение редактируемы только пока согласование идёт; после финала — блокировка.
  const editable = process ? process.status === 'active' || process.status === 'revision' : false;
  const currentStep = process?.steps.find((s) => s.state === 'current');
  const waiting = currentStep?.assignees.filter((a) => a.is_pending && a.is_active).map((a) => a.name).join(', ');

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
    const previousSteps = process.steps
      .filter((s) => s.step_order < process.current_step_order)
      .map((s) => ({ step_order: s.step_order, name: s.name }));
    openModal({
      type: 'approvalDecision',
      title: 'Принятие решения',
      modalData: {
        processId: process.id,
        currentStepOrder: process.current_step_order,
        canDelegate: currentStep?.can_delegate ?? false,
        canReturnToPrevious: currentStep?.can_return_to_previous ?? false,
        previousSteps,
      },
      onConfirm: () => {},
      onCancel: () => {},
    });
  };

  const actions = process ? (
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
      {process.decisions.length > 0 && (
        <Button icon={<PrinterOutlined />} onClick={() => setSheetOpen(true)}>
          Лист согласования
        </Button>
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
      {state.can_start_approval && state.available_routes.length > 0 && (
        <Button type="primary" onClick={openStart}>
          Новое согласование
        </Button>
      )}
    </Space>
  ) : null;

  const content = (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {process && (
        <>
          {/* Сводка-бар */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Space wrap>
              <Badge status={STATUS_BADGE[process.status] ?? 'default'} text={APPROVAL_STATUS_LABELS[process.status]} />
              {process.status === 'active' && waiting ? (
                <Typography.Text type="secondary">· Ждём: {waiting}</Typography.Text>
              ) : null}
              {currentStep?.deadline_at && process.status === 'active' ? (
                <Tag icon={<ClockCircleOutlined />} color={currentStep.is_overdue ? 'red' : 'default'}>
                  {currentStep.is_overdue ? 'Просрочено' : `Срок: ${new Date(currentStep.deadline_at).toLocaleDateString('ru-RU')}`}
                </Tag>
              ) : null}
              {process.route_name ? <Typography.Text type="secondary">· {process.route_name}</Typography.Text> : null}
            </Space>
            {actions}
          </div>

          {(process.status === 'revision' || process.status === 'rejected') && process.completion_comment ? (
            <Typography.Text type={process.status === 'rejected' ? 'danger' : 'warning'}>
              Комментарий: {process.completion_comment}
            </Typography.Text>
          ) : null}

          {/* Маршрут — горизонтальный степпер */}
          <Steps
            size="small"
            items={process.steps.map((s) => ({
              status: stepStatus(s),
              title: (
                <Space size={4} wrap>
                  <span>{s.name}</span>
                  {s.step_role_name ? <Tag color={s.step_role_color ?? undefined}>{s.step_role_name}</Tag> : null}
                </Space>
              ),
              description: <StepAssignees step={s} />,
            }))}
          />

          {/* 2 колонки: документы / лента */}
          <Row gutter={16}>
            <Col xs={24} md={9}>
              <Card size="small" title="Документы на согласовании">
                <ApprovalDocuments entityType={entityType} entityId={entityId} editable={state.can_resubmit} />
              </Card>
            </Col>
            <Col xs={24} md={15}>
              <Card size="small" title="Лента согласования">
                <ApprovalFeed
                  processId={process.id}
                  decisions={process.decisions}
                  events={process.events}
                  initiatedAt={process.initiated_at}
                  initiatorName={process.initiator_name}
                  editable={editable}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {!process && state.can_start_approval ? (
        state.available_routes.length > 0 ? (
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

      <Modal
        open={sheetOpen}
        title="Лист согласования"
        footer={null}
        width={760}
        onCancel={() => setSheetOpen(false)}
      >
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={process?.decisions ?? []}
          columns={[
            { title: 'Согласующий', dataIndex: 'decided_by_name' },
            { title: 'Решение', dataIndex: 'decision_type', render: (t: keyof typeof DECISION_LABELS) => DECISION_LABELS[t] },
            { title: 'Дата', dataIndex: 'decided_at', render: (v: string) => new Date(v).toLocaleString('ru-RU') },
            { title: 'Комментарий', dataIndex: 'comment', render: (c: string | null) => c ?? '—' },
          ]}
        />
      </Modal>
    </Space>
  );

  if (variant === 'compact') return content;
  return <Card title="Согласование">{content}</Card>;
}
