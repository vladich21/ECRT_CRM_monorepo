import type { IApi, ITask } from '@svar-ui/react-gantt';

type TaskStore = {
  byId?: (id: string | number) => (ITask & { entityKind?: string }) | undefined;
};

export function getTaskStore(api: IApi): TaskStore {
  return api.getState().tasks as TaskStore;
}

export function findAncestorByKind(
  api: IApi,
  startId: string | number,
  kind: string,
): (ITask & { entityKind?: string }) | null {
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
