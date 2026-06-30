import { CheckOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Drawer, Popover, Tag } from 'antd';
import { Fragment, useState, type ReactNode } from 'react';

import type { ApprovalDecisionView, ApprovalStepView } from '@/types/approval';

import styles from './ApprovalStepsBoard.module.scss';

/** Доска шагов согласования (вариант «фокус на текущем»):
 *  — мини-рельс из узлов с краткой инфо по наведению;
 *  — крупная карточка-спотлайт текущего шага с действием;
 *  — детальный маршрут (все шаги, участники, решения) в выезжающей панели. */

interface ApprovalStepsBoardProps {
  steps: ApprovalStepView[];
  decisions: ApprovalDecisionView[];
  /** Показать кнопку «Принять решение» на текущем шаге. */
  canApprove?: boolean;
  onDecide?: () => void;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

type AvKind = 'done' | 'wait' | 'idle';
type AvSize = 'sm' | 'md' | 'lg';

function Av({ name, kind, size = 'md' }: { name: string; kind: AvKind; size?: AvSize }) {
  return <span className={`${styles.av} ${styles[kind]} ${styles[size]}`}>{initials(name)}</span>;
}

function approvalsOf(step: ApprovalStepView, decisions: ApprovalDecisionView[]) {
  return decisions.filter((d) => d.step_order === step.step_order && d.decision_type === 'approved');
}

/** Подпись типа шага + прогресс. */
function typeMeta(step: ApprovalStepView): string {
  const total = step.assignees.length;
  if (step.step_type === 'sequential') {
    const q = step.sequential_queue ?? [];
    const done = q.filter((x) => x.state === 'done').length;
    return `по очереди · ${done}/${q.length}`;
  }
  if (step.step_type === 'any') return `любой из ${total} · кворум`;
  const approved = step.assignees.filter((a) => !a.is_pending).length;
  return `нужны все · ${approved}/${total}`;
}

interface Row {
  key: string;
  name: string;
  kind: AvKind;
  status: string;
}

/** Список участников шага с их статусом (для поповера и для деталки). */
function stepRows(step: ApprovalStepView, decisions: ApprovalDecisionView[]): Row[] {
  if (step.step_type === 'sequential' && step.sequential_queue?.length) {
    return step.sequential_queue.map((x, i) => ({
      key: x.id,
      name: `${i + 1}. ${x.name}`,
      kind: x.state === 'done' ? 'done' : x.state === 'active' ? 'wait' : 'idle',
      status: x.state === 'done' ? '✓' : x.state === 'active' ? 'сейчас' : 'далее',
    }));
  }
  return step.assignees.map((a) => {
    const dec = decisions.find((d) => d.decided_by === a.assignee_id && d.step_order === step.step_order);
    if (!a.is_pending) {
      return { key: a.assignee_id, name: a.name, kind: 'done', status: dec ? `✓ ${fmtDateTime(dec.decided_at)}` : '✓' };
    }
    if (step.state === 'completed') {
      return { key: a.assignee_id, name: a.name, kind: 'idle', status: 'не требуется' };
    }
    if (step.state === 'current') {
      const kind: AvKind = a.is_active ? 'wait' : 'idle';
      const status = a.is_active ? (step.step_type === 'any' ? 'может решить' : 'ждём решения') : 'ожидает';
      return { key: a.assignee_id, name: a.name, kind, status };
    }
    return { key: a.assignee_id, name: a.name, kind: 'idle', status: 'ожидает' };
  });
}

/** Комментарий решения завершённого шага (первый непустой). */
function stepComment(step: ApprovalStepView, decisions: ApprovalDecisionView[]) {
  const d = approvalsOf(step, decisions).find((x) => x.comment && x.comment.trim());
  return d ? { author: d.decided_by_name, text: (d.comment ?? '').trim() } : null;
}

/** Кого крупно показываем в спотлайте текущего шага (null → «Любой из N»). */
function spotlightWho(step: ApprovalStepView): string | null {
  if (step.step_type === 'sequential' && step.sequential_queue?.length) {
    return step.sequential_queue.find((x) => x.state === 'active')?.name ?? null;
  }
  if (step.step_type === 'any' && step.assignees.length > 1) return null;
  const a = step.assignees.find((x) => x.is_active) ?? step.assignees.find((x) => x.is_pending) ?? step.assignees[0];
  return a?.name ?? null;
}

function nodeCls(step: ApprovalStepView): string {
  if (step.state === 'completed') return styles.done;
  if (step.state === 'current') return styles.current;
  return '';
}

const STATE_BADGE: Record<ApprovalStepView['state'], { label: string; cls: string }> = {
  completed: { label: 'Готово', cls: styles.bDone },
  current: { label: 'Текущий', cls: styles.bCur },
  pending: { label: 'Ожидает', cls: styles.bIdle },
};

function RowList({ rows }: { rows: Row[] }) {
  return (
    <div className={styles.rows}>
      {rows.map((r) => (
        <div key={r.key} className={`${styles.rrow} ${styles[r.kind]}`}>
          <Av name={r.name.replace(/^\d+\.\s*/, '')} kind={r.kind} size="sm" />
          <span className={styles.rnm}>{r.name}</span>
          <span className={`${styles.rst} ${styles[r.kind]}`}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

/** Краткий поповер узла рельса. */
function railPopover(step: ApprovalStepView, decisions: ApprovalDecisionView[]): ReactNode {
  const rows = stepRows(step, decisions);
  const shown = rows.slice(0, 4);
  return (
    <div className={styles.pop}>
      <div className={styles.popTitle}>
        {step.step_order}. {step.name}
      </div>
      <div className={styles.popMeta}>{typeMeta(step)}</div>
      {shown.length ? <RowList rows={shown} /> : <div className={styles.popEmpty}>Назначается на шаге</div>}
      {rows.length > shown.length ? <div className={styles.popMore}>…ещё {rows.length - shown.length}</div> : null}
    </div>
  );
}

/** Один шаг в детальном маршруте (Drawer). */
function DrawerStep({ step, decisions }: { step: ApprovalStepView; decisions: ApprovalDecisionView[] }) {
  const rows = stepRows(step, decisions);
  const badge = STATE_BADGE[step.state];
  const comment = step.state === 'completed' ? stepComment(step, decisions) : null;
  const isDone = step.state === 'completed';
  return (
    <div className={`${styles.dstep} ${isDone ? styles.done : ''}`}>
      <span className={`${styles.dnode} ${nodeCls(step)}`}>{isDone ? <CheckOutlined /> : step.step_order}</span>
      <div className={styles.dtop}>
        <span className={styles.dname}>
          {step.step_order}. {step.name}
        </span>
        <span className={`${styles.sbadge} ${badge.cls}`}>{badge.label}</span>
      </div>
      <div className={styles.dmeta}>
        {step.step_role_name ? (
          <Tag color={step.step_role_color ?? undefined} style={{ margin: 0 }}>
            {step.step_role_name}
          </Tag>
        ) : null}
        <span className={styles.mchip}>{typeMeta(step)}</span>
        {step.deadline_at ? (
          <span className={`${styles.mchip} ${step.is_overdue ? styles.mchipOver : ''}`}>
            <ClockCircleOutlined /> {step.is_overdue ? 'просрочено' : fmtDateTime(step.deadline_at)}
          </span>
        ) : null}
      </div>
      {rows.length ? <RowList rows={rows} /> : <div className={styles.popEmpty}>Согласующие будут назначены при переходе на шаг.</div>}
      {comment ? (
        <div className={styles.dcmt}>
          <b>{comment.author}:</b> {comment.text}
        </div>
      ) : null}
    </div>
  );
}

export function ApprovalStepsBoard({ steps, decisions, canApprove, onDecide }: ApprovalStepsBoardProps) {
  const [open, setOpen] = useState(false);
  const current = steps.find((s) => s.state === 'current');
  const currentOrder = current?.step_order ?? steps.length;

  const who = current ? spotlightWho(current) : null;

  return (
    <div className={styles.wrap}>
      {/* мини-рельс + кнопка детального маршрута */}
      <div className={styles.railRow}>
        <div className={styles.rail}>
          {steps.map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 ? <span className={`${styles.conn} ${steps[i - 1].state === 'completed' ? styles.connDone : ''}`} /> : null}
              <Popover content={railPopover(s, decisions)} placement="bottom" mouseEnterDelay={0.12}>
                <span className={`${styles.node} ${nodeCls(s)}`}>{s.state === 'completed' ? <CheckOutlined /> : s.step_order}</span>
              </Popover>
            </Fragment>
          ))}
        </div>
        <span className={styles.counter}>
          {currentOrder} / {steps.length}
        </span>
        <Button size="small" onClick={() => setOpen(true)}>
          Весь маршрут <RightOutlined />
        </Button>
      </div>

      {/* спотлайт текущего шага */}
      {current ? (
        <div className={styles.spot}>
          <div className={styles.kicker}>
            Текущий шаг · {current.step_order} из {steps.length}
          </div>
          <h2 className={styles.spotTitle}>{current.name}</h2>
          <div className={styles.spotRow}>
            <div className={styles.whoWait}>
              {who ? (
                <Av name={who} kind="wait" size="lg" />
              ) : (
                <span className={styles.counterLg}>{current.assignees.length}</span>
              )}
              <div>
                <div className={styles.whoName}>{who ?? `Любой из ${current.assignees.length}`}</div>
                <div className={styles.whoRole}>{current.step_role_name ?? 'Согласующий'} · ждём решения</div>
              </div>
            </div>
            <div className={styles.chips}>
              <span className={styles.chip}>{typeMeta(current)}</span>
              <span className={`${styles.chip} ${current.is_overdue ? styles.chipOver : ''}`}>
                <ClockCircleOutlined />{' '}
                {current.deadline_at ? (current.is_overdue ? 'просрочено' : fmtDateTime(current.deadline_at)) : 'без срока'}
              </span>
            </div>
            {canApprove && onDecide ? (
              <div className={styles.acts}>
                <Button type="primary" onClick={onDecide}>
                  Принять решение
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* детальный маршрут */}
      <Drawer
        title={`Маршрут согласования · ${steps.length} шагов`}
        open={open}
        onClose={() => setOpen(false)}
        width={560}
      >
        <div className={styles.dlist}>
          {steps.map((s) => (
            <DrawerStep key={s.id} step={s} decisions={decisions} />
          ))}
        </div>
      </Drawer>
    </div>
  );
}
