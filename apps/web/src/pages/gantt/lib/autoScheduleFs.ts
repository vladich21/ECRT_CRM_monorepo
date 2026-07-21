import type { ILink, ITask, TID } from '@svar-ui/react-gantt';

import { startAfterPredecessorEnd, toDayStart } from './workCalendar';

const MS_PER_DAY = 86_400_000;

function addDays(date: Date, days: number): Date {
  const next = toDayStart(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Inclusive calendar-day duration (как в mapHierarchyToGantt / SVAR day unit). */
export function durationFromRange(start: Date, end: Date): number {
  const startMs = toDayStart(start).getTime();
  const endMs = toDayStart(end).getTime();
  return Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY) + 1);
}

export function endFromStartAndDuration(start: Date, duration: number): Date {
  return addDays(start, Math.max(1, duration) - 1);
}

function cloneTask(task: ITask): ITask {
  return {
    ...task,
    start: task.start ? new Date(task.start) : task.start,
    end: task.end ? new Date(task.end) : task.end,
  };
}

function isSummary(task: ITask): boolean {
  return task.type === 'summary';
}

function taskKey(id: TID | undefined): string {
  return String(id ?? '');
}

/**
 * Forward-pass auto-scheduling по связям Finish-to-Start (`e2s`).
 * Старт последователя — первый рабочий день после окончания предшественника
 * (выходные и праздники РФ пропускаются).
 * Длительность остаётся в календарных днях (линейная шкала MIT SVAR).
 * Summary-даты — от детей (min start / max end).
 * При цикле в графе — исходный снимок без изменений.
 */
export function autoScheduleFs(tasks: ITask[], links: ILink[]): ITask[] {
  if (tasks.length === 0) return [];

  const next = tasks.map(cloneTask);
  const byId = new Map<string, ITask>();
  for (const task of next) {
    if (task.id != null) byId.set(taskKey(task.id), task);
  }

  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();

  for (const link of links) {
    if (link.type !== 'e2s') continue;
    const source = taskKey(link.source);
    const target = taskKey(link.target);
    if (!byId.has(source) || !byId.has(target)) continue;

    const preds = predecessors.get(target) ?? [];
    preds.push(source);
    predecessors.set(target, preds);

    const succs = successors.get(source) ?? [];
    succs.push(target);
    successors.set(source, succs);
  }

  const leafIds = next.filter(task => !isSummary(task) && task.id != null).map(task => taskKey(task.id));

  const indegree = new Map<string, number>();
  for (const id of leafIds) {
    indegree.set(
      id,
      (predecessors.get(id) ?? []).filter(pred => byId.has(pred) && !isSummary(byId.get(pred)!)).length,
    );
  }

  const queue = leafIds.filter(id => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succ of successors.get(id) ?? []) {
      if (!indegree.has(succ)) continue;
      const value = (indegree.get(succ) ?? 0) - 1;
      indegree.set(succ, value);
      if (value === 0) queue.push(succ);
    }
  }

  if (order.length < leafIds.length) {
    console.warn('[autoScheduleFs] Обнаружен цикл в FS-зависимостях — пересчёт пропущен');
    return tasks.map(cloneTask);
  }

  for (const id of order) {
    const task = byId.get(id);
    if (!task?.start) continue;

    const duration =
      task.duration != null && task.duration > 0
        ? task.duration
        : task.end
          ? durationFromRange(task.start, task.end)
          : 1;

    const predEnds = (predecessors.get(id) ?? [])
      .map(predId => byId.get(predId))
      .filter((pred): pred is ITask => Boolean(pred?.end) && !isSummary(pred!))
      .map(pred => toDayStart(pred.end!));

    let start = toDayStart(task.start);
    if (predEnds.length > 0) {
      const latestPredEnd = new Date(Math.max(...predEnds.map(date => date.getTime())));
      const minStart = startAfterPredecessorEnd(latestPredEnd);
      if (minStart.getTime() > start.getTime()) {
        start = minStart;
      }
    }

    task.start = start;
    task.duration = duration;
    task.end = endFromStartAndDuration(start, duration);
  }

  rollupSummaryDates(next, byId);
  return next;
}

function rollupSummaryDates(tasks: ITask[], byId: Map<string, ITask>): void {
  const childrenByParent = new Map<string, ITask[]>();

  for (const task of tasks) {
    const parentId = taskKey(task.parent ?? 0);
    const list = childrenByParent.get(parentId) ?? [];
    list.push(task);
    childrenByParent.set(parentId, list);
  }

  const depthMemo = new Map<string, number>();

  function depthOf(task: ITask): number {
    const id = taskKey(task.id);
    const cached = depthMemo.get(id);
    if (cached != null) return cached;

    const parentId = task.parent;
    if (parentId == null || parentId === 0 || parentId === '0') {
      depthMemo.set(id, 0);
      return 0;
    }

    const parent = byId.get(taskKey(parentId));
    const depth = parent ? depthOf(parent) + 1 : 0;
    depthMemo.set(id, depth);
    return depth;
  }

  const summaries = tasks.filter(isSummary).slice().sort((a, b) => depthOf(b) - depthOf(a));

  for (const summary of summaries) {
    const children = childrenByParent.get(taskKey(summary.id)) ?? [];
    if (children.length === 0) continue;

    const starts = children.map(child => child.start).filter((date): date is Date => Boolean(date));
    const ends = children.map(child => child.end).filter((date): date is Date => Boolean(date));
    if (starts.length === 0 || ends.length === 0) continue;

    const start = new Date(Math.min(...starts.map(date => toDayStart(date).getTime())));
    const end = new Date(Math.max(...ends.map(date => toDayStart(date).getTime())));
    summary.start = start;
    summary.end = end;
    summary.duration = durationFromRange(start, end);
  }
}

export function tasksDatesEqual(a: ITask, b: ITask): boolean {
  const startA = a.start?.getTime() ?? null;
  const startB = b.start?.getTime() ?? null;
  const endA = a.end?.getTime() ?? null;
  const endB = b.end?.getTime() ?? null;
  return startA === startB && endA === endB && (a.duration ?? null) === (b.duration ?? null);
}
