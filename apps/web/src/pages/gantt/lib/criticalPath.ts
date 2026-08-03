import type { ILink, ITask, TID } from '@svar-ui/react-gantt';

import { GANTT_DOMAIN_TASK_TYPE } from '../ganttTaskTypes';
import { durationFromRange } from './autoScheduleFs';
import { toDayStart } from './workCalendar';

export type CriticalPathResult = {
  taskIds: Set<string>;
  linkIds: Set<string>;
};

function taskKey(id: TID | undefined): string {
  return String(id ?? '');
}

function isLeaf(task: ITask & { entityKind?: string }): boolean {
  if (task.entityKind && task.entityKind !== 'task') return false;
  return task.type !== 'summary' && task.type !== GANTT_DOMAIN_TASK_TYPE;
}

function taskDuration(task: ITask): number {
  if (task.duration != null && task.duration > 0) return task.duration;
  if (task.start && task.end) return durationFromRange(toDayStart(task.start), toDayStart(task.end));
  return 1;
}

/**
 * Корень проекта (узел с parent === 0) для задачи.
 * Листья с parent===0 (плоские тесты/сироты) кладём в общий бакет —
 * иначе каждая задача становится «проектом» из одного узла.
 */
function projectRootId(taskId: string, byId: Map<string, ITask>): string {
  let current = byId.get(taskId);
  if (!current) return taskId;

  const seen = new Set<string>();
  while (current) {
    const id = taskKey(current.id);
    if (seen.has(id)) return id;
    seen.add(id);

    const parent = current.parent;
    if (parent == null || parent === 0 || parent === '0') {
      return isLeaf(current) ? '__flat_root__' : id;
    }

    const parentTask = byId.get(taskKey(parent));
    if (!parentTask) return id;
    current = parentTask;
  }

  return taskId;
}

/**
 * CPM по одному связному набору листьев (один проект / компонент).
 */
function computeCriticalPathForLeaves(
  leafIds: string[],
  byId: Map<string, ITask>,
  predecessors: Map<string, Array<{ predId: string; linkId: string }>>,
  successors: Map<string, Array<{ succId: string; linkId: string }>>,
  links: ILink[],
): CriticalPathResult {
  const empty: CriticalPathResult = { taskIds: new Set(), linkIds: new Set() };
  if (leafIds.length === 0) return empty;

  const leafSet = new Set(leafIds);
  const duration = new Map<string, number>();
  for (const id of leafIds) {
    duration.set(id, taskDuration(byId.get(id)!));
  }

  const indegree = new Map<string, number>();
  for (const id of leafIds) {
    const preds = (predecessors.get(id) ?? []).filter(p => leafSet.has(p.predId));
    indegree.set(id, preds.length);
  }

  const queue = leafIds.filter(id => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const { succId } of successors.get(id) ?? []) {
      if (!leafSet.has(succId) || !indegree.has(succId)) continue;
      const next = (indegree.get(succId) ?? 0) - 1;
      indegree.set(succId, next);
      if (next === 0) queue.push(succId);
    }
  }

  // цикл внутри проекта — не подсвечиваем этот компонент
  if (order.length < leafIds.length) {
    return empty;
  }

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const predEfs = (predecessors.get(id) ?? [])
      .filter(p => leafSet.has(p.predId))
      .map(({ predId }) => ef.get(predId) ?? 0);
    const start = predEfs.length > 0 ? Math.max(...predEfs) : 0;
    const finish = start + (duration.get(id) ?? 1);
    es.set(id, start);
    ef.set(id, finish);
  }

  const projectEnd = Math.max(...leafIds.map(id => ef.get(id) ?? 0));

  const ls = new Map<string, number>();
  const lf = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const id = order[i]!;
    const succStarts = (successors.get(id) ?? [])
      .filter(s => leafSet.has(s.succId))
      .map(({ succId }) => ls.get(succId) ?? projectEnd);
    const lateFinish = succStarts.length > 0 ? Math.min(...succStarts) : projectEnd;
    const lateStart = lateFinish - (duration.get(id) ?? 1);
    lf.set(id, lateFinish);
    ls.set(id, lateStart);
  }

  const taskIds = new Set<string>();
  for (const id of leafIds) {
    if ((es.get(id) ?? 0) === (ls.get(id) ?? 0)) {
      taskIds.add(id);
    }
  }

  const linkIds = new Set<string>();
  for (const link of links) {
    if (link.type !== 'e2s') continue;
    const source = taskKey(link.source);
    const target = taskKey(link.target);
    if (!taskIds.has(source) || !taskIds.has(target)) continue;
    if ((ef.get(source) ?? -1) === (es.get(target) ?? -2)) {
      linkIds.add(String(link.id ?? `${source}->${target}`));
    }
  }

  return { taskIds, linkIds };
}

/**
 * Critical path (MIT): longest-path CPM по длительностям на графе e2s.
 *
 * Считаем **по каждому проекту отдельно** (корень parent===0): иначе на общем
 * чарте выигрывает самый длинный чужой проект, а DEMO/короткие проекты не
 * подсвечиваются.
 *
 * Календарные «дыры» (выходные между задачами) в float не дают —
 * иначе стартовая задача ложно выпадает с критического пути.
 */
export function computeCriticalPath(tasks: ITask[], links: ILink[]): CriticalPathResult {
  const empty: CriticalPathResult = { taskIds: new Set(), linkIds: new Set() };
  if (tasks.length === 0) return empty;

  const byId = new Map<string, ITask>();
  for (const task of tasks) {
    if (task.id != null) byId.set(taskKey(task.id), task);
  }

  const predecessors = new Map<string, Array<{ predId: string; linkId: string }>>();
  const successors = new Map<string, Array<{ succId: string; linkId: string }>>();

  for (const link of links) {
    if (link.type !== 'e2s') continue;
    const source = taskKey(link.source);
    const target = taskKey(link.target);
    const sourceTask = byId.get(source);
    const targetTask = byId.get(target);
    if (!sourceTask || !targetTask) continue;
    if (!isLeaf(sourceTask) || !isLeaf(targetTask)) continue;

    const linkId = String(link.id ?? `${source}->${target}`);
    const preds = predecessors.get(target) ?? [];
    preds.push({ predId: source, linkId });
    predecessors.set(target, preds);

    const succs = successors.get(source) ?? [];
    succs.push({ succId: target, linkId });
    successors.set(source, succs);
  }

  const leafIds = tasks.filter(task => task.id != null && isLeaf(task)).map(task => taskKey(task.id));
  if (leafIds.length === 0) return empty;

  const byProject = new Map<string, string[]>();
  for (const id of leafIds) {
    const root = projectRootId(id, byId);
    const list = byProject.get(root) ?? [];
    list.push(id);
    byProject.set(root, list);
  }

  const taskIds = new Set<string>();
  const linkIds = new Set<string>();

  for (const group of byProject.values()) {
    const part = computeCriticalPathForLeaves(group, byId, predecessors, successors, links);
    for (const id of part.taskIds) taskIds.add(id);
    for (const id of part.linkIds) linkIds.add(id);
  }

  return { taskIds, linkIds };
}
