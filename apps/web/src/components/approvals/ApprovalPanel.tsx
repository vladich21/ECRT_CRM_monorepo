import { ClockCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { App, Badge, Button, Card, Col, Collapse, Empty, Modal, Popconfirm, Row, Space, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { useApprovalProcess, useApprovalState, useCancelProcess } from '@/api/approvals/approvalApiHooks';
import { useModalStore } from '@/store/ModalStore';
import { APPROVAL_STATUS_LABELS, DECISION_LABELS, type ApprovalProcessStatus } from '@/types/approval';

import { ApprovalDocuments } from './ApprovalDocuments';
import { ApprovalFeed } from './ApprovalFeed';
import { ApprovalStepsBoard } from './ApprovalStepsBoard';

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

/** Детали архивного (завершённого) процесса — подгружаются по разворачиванию.
 *  Документы не показываем: они привязаны к сущности и очищаются при старте нового
 *  согласования. Архив хранит ход (шаги) и ленту (решения/комментарии). */
function ArchiveProcessDetail({ processId, active }: { processId: string; active: boolean }) {
  const { data: proc, isLoading } = useApprovalProcess(active ? processId : undefined);
  if (!active) return null;
  if (isLoading || !proc) return <Spin />;
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {proc.completion_comment ? (
        <Typography.Text type={proc.status === 'rejected' ? 'danger' : 'secondary'}>
          Комментарий: {proc.completion_comment}
        </Typography.Text>
      ) : null}
      <ApprovalStepsBoard steps={proc.steps} decisions={proc.decisions} />
      <Card size="small" title="Лента согласования">
        <ApprovalFeed
          processId={proc.id}
          decisions={proc.decisions}
          events={proc.events}
          initiatedAt={proc.initiated_at}
          initiatorName={proc.initiator_name}
          editable={false}
        />
      </Card>
    </Space>
  );
}

export function ApprovalPanel({ entityType, entityId: entityIdProp, variant = 'card' }: ApprovalPanelProps) {
  const params = useParams();
  const entityId = entityIdProp ?? (params[`${entityType}Id`] as string | undefined);
  const { message } = App.useApp();
  const openModal = useModalStore((s) => s.openModal);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [archiveKey, setArchiveKey] = useState<string | undefined>();

  const { data: state, isLoading } = useApprovalState(entityType, entityId);
  const cancel = useCancelProcess();

  if (!entityId) return null;
  if (isLoading || !state) return <Spin />;

  const process = state.process;
  // Отменённый процесс свёрнут в строку (история сохраняется, разворачивается по клику);
  // согласованные/текущие — на весь экран.
  const isCancelled = process?.status === 'cancelled';
  const collapsed = isCancelled && !expanded;
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

  const openResubmit = () => {
    if (!process) return;
    openModal({
      type: 'approvalResubmit',
      title: 'Повторная отправка на согласование',
      modalData: { processId: process.id, entityType, entityId },
      onConfirm: () => {},
      onCancel: () => {},
    });
  };

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
      {state.can_resubmit && (
        <Button onClick={openResubmit}>Отправить повторно</Button>
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
    </Space>
  ) : null;

  const content = (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {process && collapsed && (
        <Space wrap>
          <Badge status="default" text={APPROVAL_STATUS_LABELS.cancelled} />
          <Typography.Text type="secondary">
            · Согласование отменено
            {process.completed_at ? ` ${new Date(process.completed_at).toLocaleDateString('ru-RU')}` : ''}
          </Typography.Text>
          <Button type="link" size="small" onClick={() => setExpanded(true)}>
            Подробнее
          </Button>
        </Space>
      )}

      {process && !collapsed && (
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
              {isCancelled ? (
                <Button type="link" size="small" onClick={() => setExpanded(false)}>
                  Свернуть
                </Button>
              ) : null}
            </Space>
            {actions}
          </div>

          {(process.status === 'revision' || process.status === 'rejected') && process.completion_comment ? (
            <Typography.Text type={process.status === 'rejected' ? 'danger' : 'warning'}>
              Комментарий: {process.completion_comment}
            </Typography.Text>
          ) : null}

          {/* Маршрут — доска компактных карточек */}
          <ApprovalStepsBoard
            steps={process.steps}
            decisions={process.decisions}
            canApprove={state.can_approve}
            onDecide={openDecision}
          />

          {/* 2 колонки: документы / лента */}
          <Row gutter={16}>
            <Col xs={24} md={9}>
              <Card size="small" title="Документы на согласовании">
                <ApprovalDocuments entityType={entityType} entityId={entityId} />
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

  // Архив = завершённые процессы, кроме показанного в «Текущем».
  const archive = (state.completed_processes ?? []).filter((p) => p.id !== process?.id);

  // «Новое согласование» — в шапке карточки, когда есть процесс и можно запустить новый.
  const headerExtra =
    process && state.can_start_approval && state.available_routes.length > 0 ? (
      <Button type="primary" onClick={openStart}>
        Новое согласование
      </Button>
    ) : undefined;

  const archiveTab =
    archive.length > 0 ? (
      <Collapse
        accordion
        activeKey={archiveKey}
        onChange={(k) => setArchiveKey(Array.isArray(k) ? k[0] : k)}
        items={archive.map((p) => ({
          key: p.id,
          label: (
            <Space wrap>
              <Badge status={STATUS_BADGE[p.status] ?? 'default'} text={APPROVAL_STATUS_LABELS[p.status]} />
              <Typography.Text type="secondary">
                {p.completed_at
                  ? new Date(p.completed_at).toLocaleString('ru-RU')
                  : new Date(p.initiated_at).toLocaleDateString('ru-RU')}
              </Typography.Text>
            </Space>
          ),
          children: <ArchiveProcessDetail processId={p.id} active={archiveKey === p.id} />,
        }))}
      />
    ) : (
      <Empty description="Архив пуст" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    );

  const showTabs = !!process || archive.length > 0;

  return (
    <Card title="Согласование" extra={headerExtra}>
      {showTabs ? (
        <Tabs
          items={[
            { key: 'current', label: 'Текущий процесс', children: content },
            { key: 'archive', label: archive.length ? `Архив (${archive.length})` : 'Архив', children: archiveTab },
          ]}
        />
      ) : (
        content
      )}
    </Card>
  );
}
