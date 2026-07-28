import type { IApi, ITask } from '@svar-ui/react-gantt';

export type GanttStoreTask = ITask & { entityKind?: string };

type TaskStore = {
  byId?: (id: string | number) => GanttStoreTask | undefined;
};

export function getTaskStore(api: IApi): TaskStore {
  return api.getState().tasks as TaskStore;
}

/** Надёжный lookup: getTask может бросать на частичных id. */
export function getGanttTask(api: IApi, id: string | number): GanttStoreTask | undefined {
  try {
    return (api.getTask?.(id) as GanttStoreTask | undefined) ?? getTaskStore(api).byId?.(id);
  } catch {
    return getTaskStore(api).byId?.(id);
  }
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
  return task.type !== 'summary';
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

export function findAncestorByKind(
  api: IApi,
  startId: string | number,
  kind: string,
): GanttStoreTask | null {
  const tasks = getTaskStore(api);
  let current = tasks.byId?.(startId);
  let guard = 0;
  while (current && guard < 50) {
    if (current.entityKind === kind) return current;
    if (current.parent == null || current.parent === 0) return null;
    current = tasks.byId?.(current.parent);
    guard += 1;
  }
  return null;
}

/** Закрыть Editor (SVAR типизирует id как string; null = close). */
export function closeGanttEditor(api: IApi): void {
  void api.exec('show-editor', { id: null as unknown as string });
}
