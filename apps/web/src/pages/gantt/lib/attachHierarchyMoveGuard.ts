import type { IApi, ITask } from '@svar-ui/react-gantt';

type EntityKind = 'project' | 'contract' | 'stage' | 'workPackage' | 'task' | string;

type GanttTask = ITask & { entityKind?: EntityKind };

type MoveEvent = {
  id: string | number;
  mode?: 'up' | 'down' | 'before' | 'after' | 'child' | string;
  target?: string | number;
  inProgress?: boolean;
};

type TaskCollection = {
  byId: (id: string | number) => GanttTask | undefined;
  getBranch?: (id: string | number) => GanttTask[];
  getIndexById?: (id: string | number) => number;
};

function isRootId(id: string | number | null | undefined): boolean {
  return id == null || id === 0 || id === '0';
}

export function findAncestorOfKind(
  tasks: TaskCollection,
  startId: string | number | null | undefined,
  kind: EntityKind,
): GanttTask | null {
  let currentId = startId;
  let guard = 0;
  while (!isRootId(currentId) && guard < 50) {
    const node = tasks.byId(currentId as string | number);
    if (!node) return null;
    if (node.entityKind === kind) return node;
    currentId = node.parent;
    guard += 1;
  }
  return null;
}

export function isAllowedParent(
  childKind: EntityKind | undefined,
  parentKind: EntityKind | null | undefined,
): boolean {
  switch (childKind) {
    case 'project':
      return parentKind == null;
    case 'contract':
      return parentKind === 'project';
    case 'stage':
      return parentKind === 'contract';
    case 'workPackage':
      return parentKind === 'stage';
    case 'task':
      return parentKind === 'stage' || parentKind === 'workPackage' || parentKind === 'task';
    default:
      return parentKind === 'stage' || parentKind === 'workPackage' || parentKind === 'task';
  }
}

function resolveNewParentId(
  tasks: TaskCollection,
  ev: MoveEvent,
  moving: GanttTask,
): string | number | null {
  const { mode, target } = ev;

  if (mode === 'child') return target ?? null;

  if (mode === 'before' || mode === 'after') {
    if (target == null) return null;
    const targetTask = tasks.byId(target);
    if (!targetTask) return null;
    return targetTask.parent ?? 0;
  }

  if (mode === 'up' || mode === 'down') {
    return moving.parent ?? 0;
  }

  return null;
}

/**
 * - project только корень (между проектами — порядок);
 * - contract нельзя вынести из своего project;
 * - stage нельзя вынести из своего contract;
 * - task / workPackage нельзя вынести за свой stage.
 */
export function canMoveWithinHierarchy(tasks: TaskCollection, ev: MoveEvent): boolean {
  if (ev.inProgress === false) return true;

  const moving = tasks.byId(ev.id);
  if (!moving) return true;

  const kind = moving.entityKind;

  if (kind === 'project') {
    if (ev.mode === 'child') return false;
    const newParentId = resolveNewParentId(tasks, ev, moving);
    if (newParentId == null) return true;
    if (!isRootId(newParentId)) return false;
    if ((ev.mode === 'before' || ev.mode === 'after') && ev.target != null) {
      const sibling = tasks.byId(ev.target);
      if (sibling?.entityKind && sibling.entityKind !== 'project') return false;
    }
    return true;
  }

  const newParentId = resolveNewParentId(tasks, ev, moving);
  if (newParentId == null) return true;

  if (String(newParentId) === String(moving.parent ?? 0)) {
    return true;
  }

  const isRoot = isRootId(newParentId);
  const newParent = isRoot ? null : tasks.byId(newParentId);
  if (!isRoot && !newParent) return false;

  const parentKind = newParent?.entityKind ?? null;
  if (!isAllowedParent(kind, parentKind)) return false;

  if (kind === 'contract') {
    const currentProject = findAncestorOfKind(tasks, moving.parent, 'project');
    const nextProject =
      parentKind === 'project' ? newParent : findAncestorOfKind(tasks, newParentId, 'project');
    if (!currentProject || !nextProject) return false;
    return String(currentProject.id) === String(nextProject.id);
  }

  if (kind === 'stage') {
    const currentContract = findAncestorOfKind(tasks, moving.parent, 'contract');
    const nextContract =
      parentKind === 'contract' ? newParent : findAncestorOfKind(tasks, newParentId, 'contract');
    if (!currentContract || !nextContract) return false;
    return String(currentContract.id) === String(nextContract.id);
  }

  if (kind === 'workPackage' || kind === 'task' || !kind) {
    const stageNow =
      findAncestorOfKind(tasks, moving.id, 'stage') ??
      findAncestorOfKind(tasks, moving.parent, 'stage');
    const stageNext =
      parentKind === 'stage' ? newParent : findAncestorOfKind(tasks, newParentId, 'stage');
    if (!stageNow || !stageNext) return false;
    return String(stageNow.id) === String(stageNext.id);
  }

  return true;
}

export function attachHierarchyMoveGuard(api: IApi): () => void {
  const tag = { tag: 'gantt-hierarchy-guard' };
  api.detach(tag.tag);

  api.intercept(
    'move-task',
    (ev: MoveEvent) => {
      const tasks = api.getState().tasks as unknown as TaskCollection;
      if (!tasks?.byId) return true;
      return canMoveWithinHierarchy(tasks, ev);
    },
    tag,
  );

  api.intercept(
    'indent-task',
    (ev: { id: string | number; mode?: boolean }) => {
      const tasks = api.getState().tasks as unknown as TaskCollection;
      const moving = tasks?.byId?.(ev.id);
      if (!moving) return true;
      if (moving.entityKind === 'project') return false;

      if (ev.mode) {
        const branch = tasks.getBranch?.(ev.id);
        const index = tasks.getIndexById?.(ev.id);
        if (!branch || typeof index !== 'number' || index <= 0) return false;
        const prev = branch[index - 1];
        return canMoveWithinHierarchy(tasks, {
          id: ev.id,
          mode: 'child',
          target: prev.id,
        });
      }

      const parent = moving.parent != null ? tasks.byId(moving.parent) : undefined;
      if (!parent) return false;
      return canMoveWithinHierarchy(tasks, {
        id: ev.id,
        mode: 'after',
        target: parent.id,
      });
    },
    tag,
  );

  return () => {
    api.detach(tag.tag);
  };
}
