import { and, asc, eq, inArray, or, sum } from 'drizzle-orm';

import {
  contractStages,
  contracts,
  ganttLinks,
  ganttTaskAssignees,
  ganttTasks,
  ganttTaskTimeEntries,
  projects,
} from '../../../database/schema';

export type DateWarning = {
  project_id: string;
  project_name: string | null;
  contract_id: string;
  contract_name: string | null;
  reason: 'contract_start_before_project' | 'contract_end_after_project';
  project_start: string | null;
  project_end: string | null;
  contract_start: string | null;
  contract_end: string | null;
  suggested_project_start: string | null;
  suggested_project_end: string | null;
};

export type GanttTaskClass = 'technical' | 'coexecutor' | 'auxiliary';

export const GANTT_TASK_CLASSES: GanttTaskClass[] = ['technical', 'coexecutor', 'auxiliary'];

/** Имя системной вспомогательной задачи проекта. */
export const AUTO_AUXILIARY_TASK_NAME = 'Вспомогательная';

export function parseTaskClass(value: unknown): GanttTaskClass {
  if (value === 'coexecutor' || value === 'auxiliary' || value === 'technical') return value;
  return 'technical';
}

/** Задача считается завершённой для синхронизации вспомогательной. */
export function isGanttTaskDone(task: {
  status?: string | null;
  progress?: number | null;
}): boolean {
  const status = (task.status ?? '').toLowerCase().trim();
  if (['done', 'completed', 'closed', 'finished', 'complete'].includes(status)) {
    return true;
  }
  return (task.progress ?? 0) >= 100;
}

export type HierarchyTaskNode = {
  id: string;
  kind: 'task';
  name: string;
  start: string | null;
  end: string | null;
  deadline: string | null;
  progress: number;
  status: string;
  task_class: GanttTaskClass;
  is_auto_auxiliary: boolean;
  planned_hours: number | null;
  actual_hours: number | null;
  labor_hours: number | null;
  hourly_rate: number | null;
  plan_amount: number | null;
  fact_amount: number | null;
  budget: null;
  responsible_user_id: string | null;
  assignee_ids: string[];
  assignee_plans: Array<{ user_id: string; planned_hours: number }>;
  sort_order: number;
  children: HierarchyTaskNode[];
};

export function isMissingRelationError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? `${error.message} ${String((error as { cause?: { message?: string } }).cause?.message ?? '')}`
      : String(error);
  return /relation ["'].*["'] does not exist/i.test(msg);
}

export function toNum(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Календарная дата YYYY-MM-DD без UTC-сдвига. */
export function toDateStr(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string | null | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (key == null) continue;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function collectContractProjectWarnings(
  project: typeof projects.$inferSelect,
  contract: typeof contracts.$inferSelect,
): DateWarning[] {
  const pStart = toDateStr(project.startDate);
  const pEnd = toDateStr(project.endDate);
  const cStart = toDateStr(contract.startDate);
  const cEnd = toDateStr(contract.endDate);
  const warnings: DateWarning[] = [];

  const base = {
    project_id: project.id,
    project_name: project.name,
    contract_id: contract.id,
    contract_name: contract.name,
    project_start: pStart,
    project_end: pEnd,
    contract_start: cStart,
    contract_end: cEnd,
  };

  if (pStart && cStart && cStart < pStart) {
    warnings.push({
      ...base,
      reason: 'contract_start_before_project',
      suggested_project_start: cStart,
      suggested_project_end: pEnd && cEnd && cEnd > pEnd ? cEnd : pEnd,
    });
  }
  if (pEnd && cEnd && cEnd > pEnd) {
    warnings.push({
      ...base,
      reason: 'contract_end_after_project',
      suggested_project_start: pStart && cStart && cStart < pStart ? cStart : pStart,
      suggested_project_end: cEnd,
    });
  }
  return warnings;
}

/** Мин. начало / макс. окончание по дереву задач (для колонки «Окончание» у родителей). */
export function rollupTaskDateRange(nodes: HierarchyTaskNode[]): {
  start: string | null;
  end: string | null;
} {
  let start: string | null = null;
  let end: string | null = null;
  for (const node of nodes) {
    if (node.start && (!start || node.start < start)) start = node.start;
    if (node.end && (!end || node.end > end)) end = node.end;
  }
  return { start, end };
}

export function buildTaskTree(
  stageId: string,
  parentId: string | null,
  tasksByStage: Map<string, Array<typeof ganttTasks.$inferSelect>>,
  actualByTask: Map<string, number>,
  assigneesByTask: Map<string, Array<{ userId: string; plannedHours: number }>>,
  /** «Срок» этапа — подставляем в задачи без своего deadline. */
  stageDeadline: string | null = null,
): HierarchyTaskNode[] {
  const siblings = (tasksByStage.get(stageId) ?? []).filter(t =>
    parentId == null ? t.parentId == null : t.parentId === parentId,
  );

  return siblings.map(task => {
    const children = buildTaskTree(
      stageId,
      task.id,
      tasksByStage,
      actualByTask,
      assigneesByTask,
      stageDeadline,
    );
    const taskClass = parseTaskClass(task.taskClass);
    const hoursHidden = taskClass === 'coexecutor';
    const rate = task.hourlyRate != null ? toNum(task.hourlyRate) : null;

    const ownPlan = toNum(task.plannedHours);
    const ownFact = actualByTask.get(task.id) ?? 0;
    const childPlan = children.reduce((s, c) => s + (c.planned_hours ?? 0), 0);
    const childFact = children.reduce((s, c) => s + (c.actual_hours ?? 0), 0);
    const plannedHours =
      hoursHidden ? null : children.length > 0 ? childPlan : ownPlan;
    const actualHours =
      hoursHidden ? null : children.length > 0 ? childFact : ownFact;

    const childPlanRub = children.reduce((s, c) => s + (c.plan_amount ?? 0), 0);
    const childFactRub = children.reduce((s, c) => s + (c.fact_amount ?? 0), 0);
    // Technical: ₽ = ч × ставка. У родителей — сумма детей. Coexecutor: ₽ null.
    let planAmount: number | null = null;
    let factAmount: number | null = null;
    if (hoursHidden) {
      planAmount = null;
      factAmount = null;
    } else if (children.length > 0) {
      planAmount = childPlanRub;
      factAmount = childFactRub;
    } else if (rate != null && rate > 0) {
      planAmount = Math.round(ownPlan * rate * 100) / 100;
      factAmount = Math.round(ownFact * rate * 100) / 100;
    }

    const assigneeRows = assigneesByTask.get(task.id) ?? [];
    const assigneePlans = assigneeRows.map(row => ({
      user_id: row.userId,
      planned_hours: row.plannedHours,
    }));

    const ownStart = toDateStr(task.startDate);
    const ownEnd = toDateStr(task.endDate);
    const rolled = children.length > 0 ? rollupTaskDateRange(children) : null;

    return {
      id: task.id,
      kind: 'task' as const,
      name: task.name,
      start: rolled?.start ?? ownStart,
      end: rolled?.end ?? ownEnd,
      deadline: toDateStr(task.deadline) ?? stageDeadline,
      progress: task.progress ?? 0,
      status: task.status,
      task_class: taskClass,
      is_auto_auxiliary: Boolean(task.isAutoAuxiliary),
      planned_hours: plannedHours,
      actual_hours: actualHours,
      labor_hours: plannedHours,
      hourly_rate: rate,
      plan_amount: planAmount,
      fact_amount: factAmount,
      budget: null,
      responsible_user_id: task.responsibleUserId,
      assignee_ids: assigneeRows.map(row => row.userId),
      assignee_plans: assigneePlans,
      sort_order: task.sortOrder,
      children,
    };
  });
}

export { and, asc, eq, inArray, or, sum };
export {
  contractStages,
  contracts,
  ganttLinks,
  ganttTaskAssignees,
  ganttTasks,
  ganttTaskTimeEntries,
  projects,
};
