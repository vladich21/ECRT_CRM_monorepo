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

export type HierarchyTaskNode = {
  id: string;
  kind: 'task';
  name: string;
  start: string | null;
  end: string | null;
  deadline: string | null;
  progress: number;
  status: string;
  planned_hours: number;
  actual_hours: number;
  labor_hours: number;
  budget: null;
  responsible_user_id: string | null;
  assignee_ids: string[];
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

export function buildTaskTree(
  stageId: string,
  parentId: string | null,
  tasksByStage: Map<string, Array<typeof ganttTasks.$inferSelect>>,
  actualByTask: Map<string, number>,
  assigneesByTask: Map<string, string[]>,
): HierarchyTaskNode[] {
  const siblings = (tasksByStage.get(stageId) ?? []).filter(t =>
    parentId == null ? t.parentId == null : t.parentId === parentId,
  );

  return siblings.map(task => {
    const children = buildTaskTree(stageId, task.id, tasksByStage, actualByTask, assigneesByTask);
    const ownPlan = toNum(task.plannedHours);
    const ownFact = actualByTask.get(task.id) ?? 0;
    const plannedHours =
      children.length > 0 ? children.reduce((s, c) => s + c.planned_hours, 0) : ownPlan;
    const actualHours =
      children.length > 0 ? children.reduce((s, c) => s + c.actual_hours, 0) : ownFact;

    return {
      id: task.id,
      kind: 'task' as const,
      name: task.name,
      start: toDateStr(task.startDate),
      end: toDateStr(task.endDate),
      deadline: toDateStr(task.deadline),
      progress: task.progress ?? 0,
      status: task.status,
      planned_hours: plannedHours,
      actual_hours: actualHours,
      labor_hours: plannedHours,
      budget: null,
      responsible_user_id: task.responsibleUserId,
      assignee_ids: assigneesByTask.get(task.id) ?? [],
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
