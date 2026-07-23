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
 * SVAR: нативный ↑↓ при открытом соседе-summary вкладывает узел ВНУТРЬ соседа
 * (проект→проект). Мы всегда переписываем ↑↓ в before/after к ближайшему sibling.
 */
export function resolveSiblingReorderMove(
  tasks: TaskCollection,
  id: string | number,
  mode: 'up' | 'down',
): { id: string | number; mode: 'before' | 'after'; target: string | number } | null {
  const branch = tasks.getBranch?.(id);
  const index = tasks.getIndexById?.(id);
  if (!branch || typeof index !== 'number' || index < 0) return null;

  if (mode === 'up') {
    if (index <= 0) return null;
    const target = branch[index - 1]?.id;
    if (target == null) return null;
    return { id, mode: 'before', target };
  }

  if (index >= branch.length - 1) return null;
  const target = branch[index + 1]?.id;
  if (target == null) return null;
  return { id, mode: 'after', target };
}

/**
 * SVAR: ↑ у первого / ↓ у последнего ребёнка превращает move в before/after
 * относительно родителя → задача «выпрыгивает» на уровень выше. Это запрещаем.
 */
export function canReorderAmongSiblings(tasks: TaskCollection, ev: MoveEvent): boolean {
  if (ev.mode !== 'up' && ev.mode !== 'down') return true;
  return resolveSiblingReorderMove(tasks, ev.id, ev.mode) != null;
}

/**
 * - project только корень, никогда не child другого project;
 * - contract нельзя вынести из своего project;
 * - stage нельзя вынести из своего contract;
 * - task / workPackage нельзя вынести за свой stage;
 * - ↑↓ только среди siblings (без nest-into-summary).
 */
export function canMoveWithinHierarchy(tasks: TaskCollection, ev: MoveEvent): boolean {
  if (ev.inProgress === false) return true;

  const moving = tasks.byId(ev.id);
  if (!moving) return true;

  if (!canReorderAmongSiblings(tasks, ev)) return false;

  const kind = moving.entityKind;

  // Проект: только корень, только соседство с другими проектами (не child / не внутрь чужого дерева)
  if (kind === 'project') {
    if (ev.mode === 'child') return false;
    const newParentId = resolveNewParentId(tasks, ev, moving);
    if (newParentId == null) return true;
    if (!isRootId(newParentId)) return false;

    const newParent = tasks.byId(newParentId);
    if (newParent?.entityKind === 'project') return false;

    if ((ev.mode === 'before' || ev.mode === 'after') && ev.target != null) {
      const sibling = tasks.byId(ev.target);
      if (!sibling || sibling.entityKind !== 'project') return false;
      if (!isRootId(sibling.parent)) return false;
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

  // Никто не становится ребёнком другого project, кроме contract
  if (newParent?.entityKind === 'project' && kind !== 'contract') return false;

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

type PasteTempItem = { id: string | number; cut?: boolean };

function getPasteClipboard(api: IApi): PasteTempItem[] {
  const temp = (api as unknown as { _temp?: PasteTempItem[] })._temp;
  return Array.isArray(temp) ? temp : [];
}

function resolveAddTaskParentId(
  tasks: TaskCollection,
  ev: { mode?: string; target?: string | number; id?: string | number },
): string | number | null {
  const mode = ev.mode ?? 'child';
  const target = ev.target ?? ev.id;
  if (target == null) return null;

  if (mode === 'child') return target;

  const targetTask = tasks.byId(target);
  return targetTask?.parent ?? 0;
}

export function attachHierarchyMoveGuard(api: IApi): () => void {
  const tag = { tag: 'gantt-hierarchy-guard' };
  api.detach(tag.tag);

  api.intercept(
    'move-task',
    (ev: MoveEvent) => {
      const tasks = api.getState().tasks as unknown as TaskCollection;
      if (!tasks?.byId) return true;

      // Нативный ↑↓ SVAR умеет вложить в открытого соседа-summary → project in project.
      // Переписываем в before/after к соседней строке того же родителя.
      if (ev.mode === 'up' || ev.mode === 'down') {
        const safe = resolveSiblingReorderMove(tasks, ev.id, ev.mode);
        if (!safe || !canMoveWithinHierarchy(tasks, safe)) return false;

        window.queueMicrotask(() => {
          void api.exec('move-task', safe);
        });
        return false;
      }

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

  api.intercept(
    'add-task',
    (ev: { mode?: string; target?: string | number; id?: string | number; task?: GanttTask }) => {
      const tasks = api.getState().tasks as unknown as TaskCollection;
      if (!tasks?.byId) return true;

      const parentId = resolveAddTaskParentId(tasks, ev);
      if (parentId == null) return true;

      if (isRootId(parentId)) {
        // новые задачи в корень не создаём (проекты только с бэка/моков)
        return false;
      }

      const parent = tasks.byId(parentId);
      const childKind = (ev.task?.entityKind as EntityKind | undefined) ?? 'task';
      return isAllowedParent(childKind, parent?.entityKind ?? null);
    },
    tag,
  );

  api.intercept(
    'paste-task',
    (ev: { id?: string | number }) => {
      if (ev?.id == null) return false;
      const tasks = api.getState().tasks as unknown as TaskCollection;
      if (!tasks?.byId) return true;

      const clipboard = getPasteClipboard(api);
      if (clipboard.length === 0) return true;

      for (const item of clipboard) {
        const ok = canMoveWithinHierarchy(tasks, {
          id: item.id,
          mode: 'after',
          target: ev.id,
        });
        if (!ok) return false;
      }
      return true;
    },
    tag,
  );

  return () => {
    api.detach(tag.tag);
  };
}
