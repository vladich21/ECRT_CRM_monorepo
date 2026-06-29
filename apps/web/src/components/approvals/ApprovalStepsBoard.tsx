import { CheckOutlined } from '@ant-design/icons';
import { Button, Popover, Tag } from 'antd';
import type { ReactNode } from 'react';

import type { ApprovalDecisionView, ApprovalStepView } from '@/types/approval';

import styles from './ApprovalStepsBoard.module.scss';

/** Доска шагов согласования: компактные карточки (сетка с переносом) вместо
 *  горизонтального степпера. В карточке — только релевантный человек (активный
 *  согласующий / тот, кто принял решение); полный список — в поповере по наведению. */

interface ApprovalStepsBoardProps {
  steps: ApprovalStepView[];
  decisions: ApprovalDecisionView[];
  /** Показать кнопку «Принять решение» на текущем шаге. */
  canApprove?: boolean;
  onDecide?: () => void;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

type AvKind = 'done' | 'wait' | 'idle';

function Av({ name, kind, sm }: { name: string; kind: AvKind; sm?: boolean }) {
  return <span className={`${styles.av} ${styles[kind]} ${sm ? styles.sm : ''}`}>{initials(name)}</span>;
}

/** Решения-«согласовано» по шагу (для завершённых шагов). */
function approvalsOf(step: ApprovalStepView, decisions: ApprovalDecisionView[]) {
  return decisions.filter((d) => d.step_order === step.step_order && d.decision_type === 'approved');
}

/** Свёрнутая строка карточки — главный смысл состояния шага. */
function CardLine({ step, decisions }: { step: ApprovalStepView; decisions: ApprovalDecisionView[] }): ReactNode {
  if (step.state === 'completed') {
    const ds = approvalsOf(step, decisions);
    if (ds.length) {
      const extra = ds.length - 1;
      return (
        <div className={styles.line}>
          <Av name={ds[0].decided_by_name} kind="done" />
          <span className={styles.nm}>{ds[0].decided_by_name}</span>
          {extra > 0 ? <span className={styles.more}>+{extra}</span> : <CheckOutlined className={styles.tick} />}
        </div>
      );
    }
    return (
      <div className={styles.line}>
        <CheckOutlined className={styles.tick} />
        <span className={styles.nm}>Согласовано</span>
      </div>
    );
  }

  if (step.state === 'current') {
    // По очереди — текущий в очереди + прогресс.
    if (step.step_type === 'sequential' && step.sequential_queue?.length) {
      const q = step.sequential_queue;
      const active = q.find((x) => x.state === 'active');
      const doneCount = q.filter((x) => x.state === 'done').length;
      return (
        <div className={styles.line}>
          {active ? <Av name={active.name} kind="wait" /> : null}
          <span className={styles.nm}>Сейчас: {active?.name ?? '—'}</span>
          <span className={styles.more}>
            {Math.min(doneCount + 1, q.length)}/{q.length}
          </span>
        </div>
      );
    }
    // Нужны все — счётчик + кого ещё ждём.
    if (step.step_type === 'all') {
      const total = step.assignees.length;
      const approved = step.assignees.filter((a) => !a.is_pending).length;
      const pending = step.assignees.filter((a) => a.is_pending);
      const first = pending[0];
      return (
        <div className={styles.line}>
          <span className={styles.counter}>
            {approved}/{total}
          </span>
          <span className={styles.nm}>{first ? `ждём: ${first.name}` : 'ждём решения'}</span>
          {pending.length > 1 ? <span className={styles.more}>+{pending.length - 1}</span> : null}
        </div>
      );
    }
    // Кворум (any) с несколькими — достаточно одного.
    if (step.assignees.length > 1) {
      return (
        <div className={styles.line}>
          <span className={styles.counter}>{step.assignees.length}</span>
          <span className={styles.nm}>Любой из {step.assignees.length}</span>
        </div>
      );
    }
    // Один назначенец.
    const a = step.assignees[0];
    return (
      <div className={styles.line}>
        {a ? <Av name={a.name} kind="wait" /> : null}
        <span className={styles.nm}>{a?.name ?? 'Ждём решения'}</span>
      </div>
    );
  }

  // pending — плановые назначенцы из снапшота
  const planned = step.assignees[0];
  if (planned) {
    const extra = step.assignees.length - 1;
    return (
      <div className={`${styles.line} ${styles.idle}`}>
        <Av name={planned.name} kind="idle" />
        <span className={styles.nm}>{planned.name}</span>
        {extra > 0 ? <span className={styles.more}>+{extra}</span> : null}
      </div>
    );
  }
  return (
    <div className={`${styles.line} ${styles.idle}`}>
      <span className={styles.nm}>Назначается на шаге</span>
    </div>
  );
}

interface PopRow {
  key: string;
  name: string;
  kind: AvKind;
  meta?: string;
}

/** Полный список участников шага для поповера. */
function popoverRows(step: ApprovalStepView, decisions: ApprovalDecisionView[]): { title: string; rows: PopRow[] } {
  // Последовательный шаг — по очереди со статусами.
  if (step.step_type === 'sequential' && step.sequential_queue?.length) {
    const q = step.sequential_queue;
    const doneCount = q.filter((x) => x.state === 'done').length;
    const stage = step.state === 'current' ? Math.min(doneCount + 1, q.length) : doneCount;
    return {
      title: `Последовательно · этап ${stage} из ${q.length}`,
      rows: q.map((x, i) => ({
        key: x.id,
        name: `${i + 1}. ${x.name}`,
        kind: x.state === 'done' ? 'done' : x.state === 'active' ? 'wait' : 'idle',
        meta: x.state === 'done' ? '✓' : x.state === 'active' ? 'сейчас' : 'далее',
      })),
    };
  }

  if (step.assignees.length === 0) {
    return { title: 'Шаг ещё не начат', rows: [] };
  }

  const total = step.assignees.length;
  const approved = step.assignees.filter((a) => !a.is_pending).length;
  let title: string;
  if (step.state === 'completed') {
    title = step.step_type === 'any' ? `Согласующие · кворум` : `Согласующие · ${total}`;
  } else if (step.state === 'current') {
    title =
      step.step_type === 'all'
        ? `Согласовали ${approved} из ${total}`
        : step.step_type === 'any'
          ? `Достаточно одного · ${approved} из ${total}`
          : `Ждём решения · ${total}`;
  } else {
    title = `Согласующие · ${total}`;
  }

  const rows: PopRow[] = step.assignees.map((a) => {
    const dec = decisions.find((d) => d.decided_by === a.assignee_id && d.step_order === step.step_order);
    if (!a.is_pending) {
      return { key: a.assignee_id, name: a.name, kind: 'done', meta: dec ? `✓ ${time(dec.decided_at)}` : '✓' };
    }
    if (step.state === 'completed') {
      return { key: a.assignee_id, name: a.name, kind: 'idle', meta: 'не требуется' };
    }
    if (step.state === 'current') {
      const kind: AvKind = a.is_active ? 'wait' : 'idle';
      const meta = a.is_active ? (step.step_type === 'any' ? 'может решить' : 'ждём') : 'ожидает';
      return { key: a.assignee_id, name: a.name, kind, meta };
    }
    return { key: a.assignee_id, name: a.name, kind: 'idle', meta: 'ожидает' };
  });

  return { title, rows };
}

function StepCard({
  step,
  decisions,
  canApprove,
  onDecide,
}: {
  step: ApprovalStepView;
  decisions: ApprovalDecisionView[];
  canApprove?: boolean;
  onDecide?: () => void;
}) {
  const { title, rows } = popoverRows(step, decisions);
  const isCurrent = step.state === 'current';
  const isDone = step.state === 'completed';
  const numCls = isDone ? styles.done : isCurrent ? styles.current : '';
  const dotCls = isDone ? styles.done : isCurrent ? styles.current : '';

  const popContent = (
    <div className={styles.pop}>
      <div className={styles.popHead}>
        <span className={styles.popTitle}>{title}</span>
        {step.step_role_name ? (
          <Tag color={step.step_role_color ?? undefined} style={{ margin: 0 }}>
            {step.step_role_name}
          </Tag>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <div className={styles.popEmpty}>Согласующие будут назначены при переходе на шаг.</div>
      ) : (
        rows.map((r) => (
          <div key={r.key} className={`${styles.popRow} ${r.kind === 'wait' ? styles.wait : r.kind === 'idle' ? styles.idle : ''}`}>
            <Av name={r.name} kind={r.kind} sm />
            <span className={styles.nm}>{r.name}</span>
            {r.meta ? <span className={styles.meta}>{r.meta}</span> : null}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Popover content={popContent} placement="bottom" mouseEnterDelay={0.15}>
      <div className={`${styles.card} ${isCurrent ? styles.current : ''}`}>
        <div className={styles.head}>
          <span className={`${styles.num} ${numCls}`}>{isDone ? <CheckOutlined /> : step.step_order}</span>
          <span className={styles.name}>{step.name}</span>
          <span className={`${styles.dot} ${dotCls}`} />
        </div>
        <CardLine step={step} decisions={decisions} />
        {isCurrent && canApprove && onDecide ? (
          <Button type="primary" size="small" block className={styles.cardAction} onClick={onDecide}>
            Принять решение
          </Button>
        ) : null}
      </div>
    </Popover>
  );
}

export function ApprovalStepsBoard({ steps, decisions, canApprove, onDecide }: ApprovalStepsBoardProps) {
  return (
    <div className={styles.board}>
      {steps.map((s) => (
        <StepCard key={s.id} step={s} decisions={decisions} canApprove={canApprove} onDecide={onDecide} />
      ))}
    </div>
  );
}
