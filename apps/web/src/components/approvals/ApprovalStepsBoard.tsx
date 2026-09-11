import { ClockCircleOutlined } from '@ant-design/icons';

import type { ApprovalDecisionType, ApprovalDecisionView, ApprovalStepView } from '@/types/approval';

import { formatApprovalDateTime, ruStepsLabel } from './approvalFormat';
import { DEFAULT_APPROVAL_VOCABULARY, type ApprovalVocabulary } from './approvalVocabulary';
import styles from './ApprovalStepsBoard.module.scss';

interface ApprovalStepsBoardProps {
  steps: ApprovalStepView[];
  decisions: ApprovalDecisionView[];
  vocabulary?: ApprovalVocabulary;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

type AvKind = 'done' | 'wait' | 'idle' | 'reject' | 'return';

function Av({ name, kind }: { name: string; kind: AvKind }) {
  const avKind = kind === 'reject' || kind === 'return' ? 'idle' : kind;
  return <span className={`${styles.av} ${styles[avKind]}`}>{initials(name)}</span>;
}

function typeMeta(step: ApprovalStepView): string | null {
  if (step.step_type === 'sequential') {
    const queue = step.sequential_queue ?? [];
    const done = queue.filter(item => item.state === 'done').length;
    return queue.length > 1 ? `по очереди, ${done}/${queue.length}` : null;
  }
  const total = step.assignees.length;
  if (total <= 1) return null;
  if (step.step_type === 'any') return `любой из ${total}`;
  const approved = step.assignees.filter(assignee => !assignee.is_pending).length;
  return `нужны все, ${approved}/${total}`;
}

function kindForDecision(type: ApprovalDecisionType): AvKind {
  if (type === 'rejected') return 'reject';
  if (type === 'returned_to_initiator' || type === 'returned_to_step') return 'return';
  if (type === 'approved') return 'done';
  return 'idle';
}

function labelForDecision(type: ApprovalDecisionType, vocabulary: ApprovalVocabulary): string {
  if (type === 'rejected') return vocabulary.assigneeRejected;
  if (type === 'returned_to_initiator' || type === 'returned_to_step') return vocabulary.assigneeReturned;
  if (type === 'approved') return vocabulary.assigneeApproved;
  return 'Решил';
}

interface Row {
  key: string;
  name: string;
  kind: AvKind;
  status: string;
}

function stepRows(step: ApprovalStepView, decisions: ApprovalDecisionView[], vocabulary: ApprovalVocabulary): Row[] {
  if (step.step_type === 'sequential' && step.sequential_queue?.length) {
    return step.sequential_queue.map((item, index) => {
      const decision = decisions.find(d => d.decided_by === item.id && d.step_order === step.step_order);
      if (decision) {
        return {
          key: item.id,
          name: `${index + 1}. ${item.name}`,
          kind: kindForDecision(decision.decision_type),
          status: labelForDecision(decision.decision_type, vocabulary),
        };
      }
      return {
        key: item.id,
        name: `${index + 1}. ${item.name}`,
        kind: item.state === 'active' ? 'wait' : 'idle',
        status: item.state === 'active' ? 'сейчас' : item.state === 'done' ? 'не требуется' : 'далее',
      };
    });
  }
  return step.assignees.map(assignee => {
    const decision = decisions.find(
      item => item.decided_by === assignee.assignee_id && item.step_order === step.step_order,
    );
    if (decision) {
      return {
        key: assignee.assignee_id,
        name: assignee.name,
        kind: kindForDecision(decision.decision_type),
        status: labelForDecision(decision.decision_type, vocabulary),
      };
    }
    if (step.state === 'completed' || !assignee.is_pending) {
      return { key: assignee.assignee_id, name: assignee.name, kind: 'idle', status: 'не требуется' };
    }
    if (step.state === 'current') {
      const kind: AvKind = assignee.is_active ? 'wait' : 'idle';
      const status = assignee.is_active
        ? step.step_type === 'any'
          ? 'может решить'
          : 'ждем решения'
        : 'ожидает';
      return { key: assignee.assignee_id, name: assignee.name, kind, status };
    }
    return { key: assignee.assignee_id, name: assignee.name, kind: 'idle', status: 'ожидает' };
  });
}

const STATE_BADGE: Record<ApprovalStepView['state'], { label: string; cls: string }> = {
  completed: { label: 'Пройден', cls: styles.bIdle },
  current: { label: 'Текущий', cls: styles.bCur },
  pending: { label: 'Ожидает', cls: styles.bIdle },
  skipped: { label: 'Пропущен', cls: styles.bSkip },
};

function RowList({ rows }: { rows: Row[] }) {
  return (
    <div className={styles.rows}>
      {rows.map(row => (
        <div key={row.key} className={`${styles.rrow} ${styles[row.kind]}`}>
          <Av name={row.name.replace(/^\d+\.\s*/, '')} kind={row.kind} />
          <span className={styles.rnm}>{row.name}</span>
          <span className={`${styles.rst} ${styles[row.kind]}`}>{row.status}</span>
        </div>
      ))}
    </div>
  );
}

function DrawerStep({
  step,
  decisions,
  vocabulary,
  showStepIndex,
  showStateBadge,
  showRole,
}: {
  step: ApprovalStepView;
  decisions: ApprovalDecisionView[];
  vocabulary: ApprovalVocabulary;
  showStepIndex: boolean;
  showStateBadge: boolean;
  showRole: boolean;
}) {
  const rows = step.state === 'skipped' ? [] : stepRows(step, decisions, vocabulary);
  const badge = STATE_BADGE[step.state];
  const isSkipped = step.state === 'skipped';
  const rule = typeMeta(step);
  const hasMeta = showRole || rule || step.deadline_at;
  return (
    <div className={`${styles.dstep} ${isSkipped ? styles.skippedStep : ''}`}>
      <div className={styles.dtop}>
        <span className={styles.dname}>{showStepIndex ? `${step.step_order}. ${step.name}` : step.name}</span>
        {showStateBadge ? <span className={`${styles.sbadge} ${badge.cls}`}>{badge.label}</span> : null}
      </div>
      {hasMeta ? (
        <div className={styles.dmeta}>
          {showRole && step.step_role_name ? <span className={styles.mchip}>{step.step_role_name}</span> : null}
          {rule ? <span className={styles.mchip}>{rule}</span> : null}
          {step.deadline_at ? (
            <span className={`${styles.mchip} ${step.is_overdue ? styles.mchipOver : ''}`}>
              <ClockCircleOutlined /> {step.is_overdue ? 'просрочено' : formatApprovalDateTime(step.deadline_at)}
            </span>
          ) : null}
        </div>
      ) : null}
      {rows.length ? (
        <RowList rows={rows} />
      ) : isSkipped ? (
        <div className={styles.popEmpty}>Инициатор не включил этот шаг при запуске согласования.</div>
      ) : (
        <div className={styles.popEmpty}>Согласующие будут назначены при переходе на шаг.</div>
      )}
    </div>
  );
}

export function ApprovalStepsBoard({
  steps,
  decisions,
  vocabulary = DEFAULT_APPROVAL_VOCABULARY,
}: ApprovalStepsBoardProps) {
  const activeSteps = steps.filter(step => step.state !== 'skipped');
  const multiStep = activeSteps.length > 1;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.panelTitle}>Маршрут согласования</div>
        {multiStep ? <div className={styles.panelMeta}>{ruStepsLabel(activeSteps.length)}</div> : null}
      </div>
      <div className={styles.dlist}>
        {steps.map(step => (
          <DrawerStep
            key={step.id}
            step={step}
            decisions={decisions}
            vocabulary={vocabulary}
            showStepIndex={multiStep}
            showStateBadge={multiStep}
            showRole={multiStep}
          />
        ))}
      </div>
    </div>
  );
}
