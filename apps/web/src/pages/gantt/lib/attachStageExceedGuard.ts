import type { IApi, ITask } from '@svar-ui/react-gantt';

import { GANTT_UI } from '../ganttFeatures';
import { type GanttConfirmFn } from './ganttConfirm';
import {
  patchTouchesTaskDates,
  snapshotTaskDates,
  type TaskDateSnapshot,
} from './ganttTaskDatePatch';
import { getGanttTask, isGanttLeafTask, isGanttWorkTask, type GanttStoreTask } from './ganttTaskStore';
import {
  confirmStageExceedIfNeeded,
  snapshotTaskDatesFromStore,
} from './stageExceedModal';

type DateEvent = {
  id?: string | number;
  task?: Partial<ITask>;
  skipConfirm?: boolean;
  inProgress?: boolean;
};

/** SVAR commit'ит даты в store после intercept — ждём tick + paint. */
const AFTER_COMMIT_MS = 100;

function mergeDatePatch(base: TaskDateSnapshot, patch: Partial<ITask> | undefined): TaskDateSnapshot {
  const next: TaskDateSnapshot = { ...base };
  if (!patch) return next;
  if ('start' in patch) next.start = snapshotTaskDates({ start: patch.start as Date }).start;
  if ('end' in patch) next.end = snapshotTaskDates({ end: patch.end as Date }).end;
  if ('duration' in patch) {
    next.duration = typeof patch.duration === 'number' ? patch.duration : undefined;
  }
  return next;
}

/**
 * Адаптер SVAR → проверка «задача в сроке этапа».
 *
 * 1. remember origin при drag/resize inProgress
 * 2. после drop — scheduleCheck (не sync: store ещё без новых дат)
 * 3. editor без origin — sync по patch
 */
export function attachStageExceedGuard(
  api: IApi,
  confirm: GanttConfirmFn,
): () => void {
  const tag = { tag: 'gantt-stage-exceed-guard' };
  api.detach(tag.tag);

  const origins = new Map<string, TaskDateSnapshot>();
  const modalOpen = { value: false };
  const finalizeTimers = new Map<string, number>();

  const rememberOrigin = (id: string | number) => {
    const key = String(id);
    if (origins.has(key)) return;
    origins.set(key, snapshotTaskDatesFromStore(api, id));
  };

  const runCheck = (id: string | number, attempt = 0) => {
    const key = String(id);
    const before = origins.get(key);
    if (!before) return;

    if (!isGanttLeafTask(getGanttTask(api, id))) {
      origins.delete(key);
      return;
    }

    const after = snapshotTaskDatesFromStore(api, id);
    const changed =
      before.start?.getTime() !== after.start?.getTime() ||
      before.end?.getTime() !== after.end?.getTime();

    // Store может обновиться позже intercept — пара повторов.
    if (!changed && attempt < 2) {
      finalizeTimers.set(
        key,
        window.setTimeout(() => {
          finalizeTimers.delete(key);
          runCheck(id, attempt + 1);
        }, AFTER_COMMIT_MS),
      );
      return;
    }

    origins.delete(key);
    confirmStageExceedIfNeeded(api, id, before, after, confirm, modalOpen);
  };

  const scheduleCheck = (id: string | number) => {
    const key = String(id);
    const prev = finalizeTimers.get(key);
    if (prev != null) window.clearTimeout(prev);
    finalizeTimers.set(
      key,
      window.setTimeout(() => {
        finalizeTimers.delete(key);
        runCheck(id);
      }, AFTER_COMMIT_MS),
    );
  };

  const isStructural = (task: GanttStoreTask | undefined) =>
    Boolean(task?.entityKind && !isGanttWorkTask(task));

  api.intercept(
    'drag-task',
    (ev: { id?: string | number; top?: number; inProgress?: boolean }) => {
      if (ev?.id == null || typeof ev.top !== 'undefined') return true;
      if (!isGanttLeafTask(getGanttTask(api, ev.id))) return false;
      if (ev.inProgress !== false) rememberOrigin(ev.id);
      return true;
    },
    tag,
  );

  api.on(
    'drag-task',
    (ev: { id?: string | number; top?: number; inProgress?: boolean }) => {
      if (ev.inProgress !== false || ev.id == null || typeof ev.top !== 'undefined') return;
      if (!origins.has(String(ev.id))) return;
      scheduleCheck(ev.id);
    },
    tag,
  );

  api.intercept(
    'update-task',
    (ev: DateEvent) => {
      if (!GANTT_UI.dateChangeConfirm || ev?.skipConfirm || ev?.id == null) return true;

      const id = ev.id;
      const key = String(id);
      const current = getGanttTask(api, id);
      const touchesDates = patchTouchesTaskDates(ev.task);
      const touchesProgress = Boolean(ev.task && 'progress' in ev.task);

      if (touchesProgress) {
        if (!isGanttLeafTask(current)) return false;
        if (touchesDates && ev.task) {
          delete ev.task.start;
          delete ev.task.end;
          delete ev.task.duration;
        }
        return true;
      }

      if (!isGanttLeafTask(current) || isStructural(current)) {
        return !isStructural(current);
      }

      if (ev.inProgress) {
        rememberOrigin(id);
        return true;
      }

      // Drag/resize: patch часто приходит до commit store — только отложенная проверка.
      if (origins.has(key)) {
        scheduleCheck(id);
        return true;
      }

      // Editor: один update с patch, origin не было.
      if (!touchesDates) return true;

      const before = snapshotTaskDatesFromStore(api, id);
      const after = mergeDatePatch(before, ev.task);
      if (confirmStageExceedIfNeeded(api, id, before, after, confirm, modalOpen)) {
        return false;
      }

      return true;
    },
    tag,
  );

  api.on(
    'update-task',
    (ev: DateEvent) => {
      if (ev?.skipConfirm || ev?.inProgress || ev?.id == null) return;
      if (!origins.has(String(ev.id))) return;
      scheduleCheck(ev.id);
    },
    tag,
  );

  return () => {
    origins.clear();
    modalOpen.value = false;
    for (const timer of finalizeTimers.values()) window.clearTimeout(timer);
    finalizeTimers.clear();
    api.detach(tag.tag);
  };
}
