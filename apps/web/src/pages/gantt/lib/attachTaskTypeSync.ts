import type { IApi, ITask } from '@svar-ui/react-gantt';

import { GANTT_DOMAIN_TASK_TYPE, isGanttDomainEntityKind } from '../ganttTaskTypes';
import { findStageForTask } from './ganttTaskStore';

type EntityKind = 'project' | 'contract' | 'stage' | 'workPackage' | 'task' | string;

type GanttTask = ITask & { entityKind?: EntityKind };

export function resolveSvarType(
  task: Pick<GanttTask, 'type' | 'entityKind'>,
  childCount: number,
): ITask['type'] {
  if (task.type === 'milestone') return 'milestone';
  if (isGanttDomainEntityKind(task.entityKind)) {
    return GANTT_DOMAIN_TASK_TYPE;
  }
  if (childCount > 0) {
    return 'summary';
  }
  return 'task';
}

export function syncTaskTypesAfterStructuralChange(api: IApi): void {
  let tasks: GanttTask[];
  try {
    tasks = api.serialize() as GanttTask[];
  } catch {
    return;
  }

  const childCount = new Map<string, number>();
  for (const task of tasks) {
    const parentKey = String(task.parent ?? 0);
    childCount.set(parentKey, (childCount.get(parentKey) ?? 0) + 1);
  }

  for (const task of tasks) {
    if (task.id == null) continue;
    const kids = childCount.get(String(task.id)) ?? 0;
    const nextType = resolveSvarType(task, kids);
    if (nextType === task.type) continue;

    void api.exec('update-task', {
      id: task.id,
      task: { type: nextType },
      skipConfirm: true,
    });
  }
}

type StructuralEvent = { inProgress?: boolean };

export function attachTaskTypeSync(api: IApi): () => void {
  const tag = { tag: 'gantt-task-type-sync' };
  api.detach(tag.tag);

  let timer: number | null = null;

  const schedule = (ev?: StructuralEvent) => {
    if (ev?.inProgress) return;
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      syncTaskTypesAfterStructuralChange(api);
    }, 0);
  };

  api.intercept(
    'add-task',
    (ev: {
      task?: GanttTask;
      mode?: string;
      target?: string | number;
    }) => {
      if (ev?.task) {
        if (!ev.task.entityKind) ev.task.entityKind = 'task';
        if (ev.task.entityKind === 'task' && ev.task.type !== 'milestone') {
          ev.task.type = 'task';
        }
        if (!ev.task.ganttStageId) {
          const anchorId = ev.target ?? ev.task.parent;
          if (anchorId != null) {
            const stage = findStageForTask(api, anchorId);
            if (stage?.id != null) {
              ev.task.ganttStageId = String(stage.id);
            }
          }
        }
      }
      return true;
    },
    tag,
  );

  for (const event of [
    'add-task',
    'copy-task',
    'paste-task',
    'delete-task',
    'move-task',
    'indent-task',
  ] as const) {
    api.on(event, schedule, tag);
  }

  return () => {
    if (timer != null) window.clearTimeout(timer);
    api.detach(tag.tag);
  };
}
