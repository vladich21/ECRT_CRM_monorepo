import type { IApi, ITask } from '@svar-ui/react-gantt';

import { cloneDate } from './ganttDates';

export type TaskDateSnapshot = {
  start?: Date;
  end?: Date;
  duration?: number;
};

export function applyGanttTaskDates(
  api: IApi,
  id: string | number,
  snapshot: TaskDateSnapshot,
): void {
  void api.exec('update-task', {
    id,
    task: {
      start: snapshot.start,
      end: snapshot.end,
      duration: snapshot.duration,
    },
    skipConfirm: true,
  });
}

export function snapshotTaskDates(task: Partial<ITask> | undefined): TaskDateSnapshot {
  return {
    start: cloneDate(task?.start),
    end: cloneDate(task?.end),
    duration: typeof task?.duration === 'number' ? task.duration : undefined,
  };
}

export function patchTouchesTaskDates(patch: Partial<ITask> | undefined): boolean {
  if (!patch) return false;
  return 'start' in patch || 'end' in patch || 'duration' in patch;
}
