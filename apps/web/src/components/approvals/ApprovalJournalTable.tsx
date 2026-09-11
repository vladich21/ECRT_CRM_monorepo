import { Table } from 'antd';

import { DECISION_LABELS, type ApprovalDecisionType, type ApprovalDecisionView, type ApprovalStepView } from '@/types/approval';

import { formatApprovalDateTime } from './approvalFormat';
import styles from './ApprovalJournalTable.module.scss';

type StatusKind = 'done' | 'reject' | 'return' | 'wait' | 'idle';

type Row = {
  key: string;
  process: string;
  received: string;
  user: string;
  due: string;
  completed: string;
  status: string;
  statusKind: StatusKind;
};

type Person = {
  id: string;
  name: string;
  isPending: boolean;
};

type Props = {
  routeName?: string | null;
  initiatedAt: string;
  steps: ApprovalStepView[];
  decisions: ApprovalDecisionView[];
  taskCurrentLabel?: string;
  approvedLabel?: string;
  rejectedLabel?: string;
  returnedLabel?: string;
};

function statusForDecision(
  type: ApprovalDecisionType,
  approvedLabel: string,
  rejectedLabel: string,
  returnedLabel: string,
): string {
  if (type === 'approved') return approvedLabel;
  if (type === 'rejected') return rejectedLabel;
  if (type === 'returned_to_initiator' || type === 'returned_to_step') return returnedLabel;
  return DECISION_LABELS[type];
}

function peopleOf(step: ApprovalStepView): Person[] {
  if (step.step_type === 'sequential' && step.sequential_queue?.length) {
    return step.sequential_queue.map(item => ({
      id: item.id,
      name: item.name,
      isPending: item.state !== 'done',
    }));
  }
  return step.assignees.map(assignee => ({
    id: assignee.assignee_id,
    name: assignee.name,
    isPending: assignee.is_pending,
  }));
}

function rowStatus(
  step: ApprovalStepView,
  person: Person,
  decisionLabel: string | null,
  taskCurrentLabel: string,
): string {
  if (decisionLabel) return decisionLabel;
  if (step.state === 'completed' && person.isPending) return 'Не требуется';
  if (step.state === 'current' && person.isPending) return taskCurrentLabel;
  if (person.isPending) return 'Ожидает';
  return 'Завершено';
}

function rowStatusKind(
  step: ApprovalStepView,
  person: Person,
  decisionType: ApprovalDecisionType | undefined,
): StatusKind {
  if (decisionType === 'approved') return 'done';
  if (decisionType === 'rejected') return 'reject';
  if (decisionType === 'returned_to_initiator' || decisionType === 'returned_to_step') return 'return';
  if (step.state === 'current' && person.isPending) return 'wait';
  return 'idle';
}

export function ApprovalJournalTable({
  routeName,
  initiatedAt,
  steps,
  decisions,
  taskCurrentLabel = 'На согласовании',
  approvedLabel = 'Согласовал',
  rejectedLabel = 'Отклонил',
  returnedLabel = 'Вернул',
}: Props) {
  const rows: Row[] = steps
    .filter(step => step.state !== 'skipped')
    .flatMap(step =>
      peopleOf(step).map(person => {
        const decision = decisions.find(
          item => item.decided_by === person.id && item.step_order === step.step_order,
        );
        return {
          key: `${step.id}-${person.id}`,
          process: step.name || routeName || 'Согласование',
          received: formatApprovalDateTime(initiatedAt),
          user: person.name,
          due: step.deadline_at ? formatApprovalDateTime(step.deadline_at) : '',
          completed: decision ? formatApprovalDateTime(decision.decided_at) : '',
          status: rowStatus(
            step,
            person,
            decision
              ? statusForDecision(decision.decision_type, approvedLabel, rejectedLabel, returnedLabel)
              : null,
            taskCurrentLabel,
          ),
          statusKind: rowStatusKind(step, person, decision?.decision_type),
        };
      }),
    );

  if (!rows.length) return null;

  return (
    <Table<Row>
      className={styles.table}
      size='small'
      pagination={false}
      rowKey='key'
      dataSource={rows}
      columns={[
        { title: 'Шаг', dataIndex: 'process', ellipsis: true },
        { title: 'Поступило', dataIndex: 'received', width: 150 },
        { title: 'Кто', dataIndex: 'user', ellipsis: true },
        {
          title: 'Завершить к',
          dataIndex: 'due',
          width: 150,
          render: value => value || '—',
        },
        {
          title: 'Завершено',
          dataIndex: 'completed',
          width: 150,
          render: value => value || '—',
        },
        {
          title: 'Состояние',
          dataIndex: 'status',
          width: 170,
          render: (value: string, row) => (
            <span className={`${styles.status} ${styles[row.statusKind]}`}>{value}</span>
          ),
        },
      ]}
    />
  );
}
