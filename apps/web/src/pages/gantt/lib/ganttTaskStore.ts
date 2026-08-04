import type { IApi, ITask } from '@svar-ui/react-gantt';

import { GANTT_DOMAIN_TASK_TYPE } from '../ganttTaskTypes';

export type GanttStoreTask = ITask & {
  entityKind?: string;
  ganttStageId?: string;
  stageNumber?: number;
  boundStart?: Date | string | null;
  deadline?: Date | string | null;
  timelineStart?: Date;
  timelineEnd?: Date;
};

type TaskStore = {
  byId?: (id: string | number) => GanttStoreTask | undefined;
};

export function getTaskStore(api: IApi): TaskStore {
  return api.getState().tasks as TaskStore;
}

/** Индекс задач из serialize — custom-поля (entityKind, deadline) надёжнее, чем в byId. */
export function buildGanttTaskIndex(api: IApi): Map<string, GanttStoreTask> {
  const index = new Map<string, GanttStoreTask>();
  try {
    const walk = api.serialize() as GanttStoreTask[];
    if (Array.isArray(walk)) {
      for (const task of walk) {
        if (task.id != null) index.set(String(task.id), task);
      }
    }
  } catch {
    /* fallback below */
  }

  if (index.size === 0) {
    const store = getTaskStore(api);
    const byId = store.byId;
    if (byId) {
      for (const id of collectKnownTaskIds(api)) {
        const task = byId(id);
        if (task?.id != null) index.set(String(task.id), task);
      }
    }
  }

  return index;
}

function collectKnownTaskIds(api: IApi): Array<string | number> {
  try {
    return (api.serialize() as GanttStoreTask[])
      .map(task => task.id)
      .filter((id): id is string | number => id != null);
  } catch {
    return [];
  }
}

/** Надёжный lookup: getTask может бросать на частичных id. */
export function getGanttTask(api: IApi, id: string | number): GanttStoreTask | undefined {
  try {
    const fromGet = (api.getTask?.(id) as GanttStoreTask | undefined) ?? getTaskStore(api).byId?.(id);
    if (fromGet) return fromGet;
  } catch {
    /* fallback below */
  }

  return buildGanttTaskIndex(api).get(String(id));
}

/**
 * Рабочая задача: персистим в `gantt_tasks`, открываем в Editor.
 * Project/Contract/Stage/WP — доменные summary.
 */
export function isGanttWorkTask(
  task: { entityKind?: string; type?: string } | null | undefined,
): boolean {
  if (!task) return false;
  if (task.entityKind) return task.entityKind === 'task';
  return task.type !== 'summary' && task.type !== GANTT_DOMAIN_TASK_TYPE;
}

/**
 * Лист на шкале: drag / resize / progress.
 * Родительская задача с детьми (type=summary) — даты только rollup с API.
 */
export function isGanttLeafTask(
  task: { entityKind?: string; type?: string } | null | undefined,
): boolean {
  if (!isGanttWorkTask(task)) return false;
  return task?.type !== 'summary';
}

function isStageNode(task: GanttStoreTask, index: Map<string, GanttStoreTask>): boolean {
  if (task.entityKind === 'stage') return true;
  if (task.type !== GANTT_DOMAIN_TASK_TYPE) return false;
  const parent = task.parent != null ? index.get(String(task.parent)) : undefined;
  return parent?.entityKind === 'contract';
}

export function findAncestorByKind(
  api: IApi,
  startId: string | number,
  kind: string,
): GanttStoreTask | null {
  const index = buildGanttTaskIndex(api);
  let current = index.get(String(startId));
  let guard = 0;

  while (current && guard < 50) {
    if (current.entityKind === kind) return current;
    if (kind === 'stage' && isStageNode(current, index)) return current;
    if (current.parent == null || current.parent === 0) return null;
    current = index.get(String(current.parent));
    guard += 1;
  }

  return null;
}

/** Этап задачи: ganttStageId → обход parent → эвристика domain под contract. */
export function findStageForTask(api: IApi, taskId: string | number): GanttStoreTask | null {
  const index = buildGanttTaskIndex(api);
  const task = index.get(String(taskId));

  if (task && (task.entityKind === 'stage' || isStageNode(task, index))) {
    return task;
  }

  if (task?.ganttStageId) {
    const direct = index.get(String(task.ganttStageId));
    if (direct && (direct.entityKind === 'stage' || isStageNode(direct, index))) {
      return direct;
    }
  }

  return findAncestorByKind(api, taskId, 'stage');
}

/** Закрыть Editor (SVAR типизирует id как string; null = close). */
export function closeGanttEditor(api: IApi): void {
  void api.exec('show-editor', { id: null as unknown as string });
}
