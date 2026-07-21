import type { IApi, ITask } from '@svar-ui/react-gantt';

const STORAGE_KEY = 'srn.gantt.treeOpen.v1';

/** Узлы DEMO критического пути — раскрыть при первом визите (пустой storage). */
export const CRITICAL_PATH_DEMO_OPEN_IDS = [
  'mock-critical-demo',
  'mock-cp-contract',
  'mock-cp-stage',
  'mock-cp-wp-main',
  'mock-cp-wp-side',
] as const;

export function loadOpenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .map(id => (id == null ? '' : String(id)))
        .filter(id => id.length > 0),
    );
  } catch {
    return new Set();
  }
}

/** При пустом storage — сразу раскрыть DEMO критического пути. */
export function loadOpenIdsForChart(): Set<string> {
  const ids = loadOpenIds();
  if (ids.size > 0) return ids;
  return new Set(CRITICAL_PATH_DEMO_OPEN_IDS);
}

export function saveOpenIds(ids: Iterable<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Накладывает сохранённые open только на узлы с детьми. */
export function applyOpenState(tasks: ITask[], openIds: Set<string>): ITask[] {
  const childCount = new Map<string, number>();
  for (const task of tasks) {
    const parentKey = String(task.parent ?? 0);
    childCount.set(parentKey, (childCount.get(parentKey) ?? 0) + 1);
  }

  return tasks.map(task => {
    if (task.id == null) return task;
    const id = String(task.id);
    if ((childCount.get(id) ?? 0) === 0) return task;
    return { ...task, open: openIds.has(id) };
  });
}

/**
 * Точечное обновление по open-task { id, mode }.
 * Нельзя serialize()+replace — при фильтре поиска затрутся id вне выборки.
 */
export function patchOpenId(id: string | number, open: boolean): Set<string> {
  const ids = loadOpenIds();
  const key = String(id);
  if (open) ids.add(key);
  else ids.delete(key);
  saveOpenIds(ids);
  return ids;
}

export function attachTreeOpenPersist(api: IApi): () => void {
  const tag = { tag: 'gantt-tree-open-persist' };
  api.detach(tag.tag);

  api.on(
    'open-task',
    (ev: { id?: string | number; mode?: boolean }) => {
      if (ev?.id == null || typeof ev.mode !== 'boolean') return;
      patchOpenId(ev.id, ev.mode);
    },
    tag,
  );

  return () => {
    api.detach(tag.tag);
  };
}
