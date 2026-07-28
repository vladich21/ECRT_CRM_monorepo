import type { ILink, ITask, TID } from '@svar-ui/react-gantt';

import { dayKey, durationFromRange, endFromStartAndDuration } from './ganttDates';
import { startAfterPredecessorEnd, toDayStart } from './workCalendar';

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
 * Старт последователя — первый рабочий день после окончания предшественника.
 * Двигаем только листья, которым предшественник реально мешает;
 * summary/этап на клиенте не пересчитываем (окончание этапа — с API).
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

    if (predEnds.length === 0) continue;

    const latestPredEnd = new Date(Math.max(...predEnds.map(date => date.getTime())));
    const minStart = startAfterPredecessorEnd(latestPredEnd);
    const start = toDayStart(task.start);
    if (minStart.getTime() <= start.getTime()) continue;

    task.start = minStart;
    task.duration = duration;
    task.end = endFromStartAndDuration(minStart, duration);
  }

  return next;
}

export { durationFromRange, endFromStartAndDuration } from './ganttDates';

export function tasksDatesEqual(a: ITask, b: ITask): boolean {
  return (
    dayKey(a.start) === dayKey(b.start)
    && dayKey(a.end) === dayKey(b.end)
    && (a.duration ?? null) === (b.duration ?? null)
  );
}
