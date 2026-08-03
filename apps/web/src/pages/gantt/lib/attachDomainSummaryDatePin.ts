import type { IApi, ITask } from '@svar-ui/react-gantt';

import {
  GANTT_DOMAIN_TASK_TYPE,
  isGanttDomainEntityKind,
} from '../ganttTaskTypes';
import {
  applyGanttTaskDates,
  patchTouchesTaskDates,
  snapshotTaskDates,
  type TaskDateSnapshot,
} from './ganttTaskDatePatch';
import { getGanttTask, isGanttWorkTask, type GanttStoreTask } from './ganttTaskStore';

type PinnedTimelineTask = GanttStoreTask & {
  timelineStart?: Date;
  timelineEnd?: Date;
};

/** Зафиксированные даты доменных узлов (не зависят от текущего store после rollup). */
const pinnedTimelineById = new Map<string, TaskDateSnapshot>();

function isDomainNode(task: GanttStoreTask | undefined): boolean {
  if (!task) return false;
  if (isGanttDomainEntityKind(task.entityKind)) return true;
  return task.type === GANTT_DOMAIN_TASK_TYPE;
}

function readPinnedTimeline(task: PinnedTimelineTask): TaskDateSnapshot {
  const id = task.id != null ? String(task.id) : '';
  const stored = id ? pinnedTimelineById.get(id) : undefined;
  if (stored) return stored;

  const start = task.timelineStart ?? task.start;
  const end = task.timelineEnd ?? task.end;
  return snapshotTaskDates({ start, end, duration: task.duration });
}

export function captureDomainTimelinePins(api: IApi): void {
  pinnedTimelineById.clear();
  let walk: PinnedTimelineTask[];
  try {
    walk = api.serialize() as PinnedTimelineTask[];
  } catch {
    return;
  }
  if (!Array.isArray(walk)) return;

  for (const task of walk) {
    if (task.id == null || !isDomainNode(task)) continue;
    const snapshot = snapshotTaskDates({
      start: task.timelineStart ?? task.start,
      end: task.timelineEnd ?? task.end,
      duration: task.duration,
    });
    pinnedTimelineById.set(String(task.id), snapshot);
  }
}

function rePinAllDomainNodes(api: IApi): void {
  for (const [id, snapshot] of pinnedTimelineById) {
    applyGanttTaskDates(api, id, snapshot);
  }
}

/**
 * Доп. защита: доменные узлы не должны менять start/end (SVAR summary rollup отключён через type=domain).
 */
export function attachDomainSummaryDatePin(api: IApi): () => void {
  const tag = { tag: 'gantt-domain-summary-date-pin' };
  api.detach(tag.tag);

  captureDomainTimelinePins(api);

  api.intercept(
    'drag-task',
    (ev: { id?: string | number; top?: number }) => {
      if (ev?.id == null || typeof ev.top !== 'undefined') return true;
      const task = getGanttTask(api, ev.id);
      if (isDomainNode(task)) return false;
      return true;
    },
    tag,
  );

  api.intercept(
    'update-task',
    (ev: {
      id?: string | number;
      task?: Partial<ITask>;
      skipConfirm?: boolean;
      inProgress?: boolean;
    }) => {
      if (ev?.skipConfirm || ev?.id == null) return true;

      const current = getGanttTask(api, ev.id);
      if (!patchTouchesTaskDates(ev.task)) return true;

      if (isDomainNode(current)) {
        if (ev.task) {
          delete ev.task.start;
          delete ev.task.end;
          delete ev.task.duration;
        }
        applyGanttTaskDates(api, ev.id, readPinnedTimeline(current as PinnedTimelineTask));
        return false;
      }

      if (isGanttWorkTask(current)) {
        window.queueMicrotask(() => rePinAllDomainNodes(api));
      }
      return true;
    },
    tag,
  );

  api.on(
    'drag-task',
    (ev: { inProgress?: boolean }) => {
      if (ev.inProgress !== false) return;
      captureDomainTimelinePins(api);
    },
    tag,
  );

  return () => {
    pinnedTimelineById.clear();
    api.detach(tag.tag);
  };
}
