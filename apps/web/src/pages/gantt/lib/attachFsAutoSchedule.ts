import type { IApi, ILink, ITask } from '@svar-ui/react-gantt';

import { autoScheduleFs, tasksDatesEqual } from './autoScheduleFs';
import { cloneGanttTasks, linksFromApi } from './ganttApi';
import { isGanttLeafTask } from './ganttTaskStore';
import { assertTaskDatesWithinStage } from './stageDateBounds';

type LinksFallback = { current: ILink[] };

/**
 * FS auto-schedule на событиях дат/связей.
 * Двигает только листья, которым предшественник реально мешает;
 * summary/этап не трогает (их окончание — с API).
 */
export function attachFsAutoSchedule(api: IApi, linksFallback: LinksFallback): () => void {
  const tag = { tag: 'gantt-fs-auto-schedule' };
  api.detach(tag.tag);

  let scheduling = false;

  const apply = async () => {
    if (scheduling) return;
    scheduling = true;
    try {
      const before = api.serialize();
      const links = linksFromApi(api, linksFallback.current);
      linksFallback.current = links;
      const scheduled = autoScheduleFs(cloneGanttTasks(before), links);
      const beforeById = new Map(before.map(task => [String(task.id), task]));

      const updates: Promise<unknown>[] = [];
      for (const task of scheduled) {
        if (task.id == null || !task.start || !task.end) continue;
        if (!isGanttLeafTask(task)) continue;

        const previous = beforeById.get(String(task.id));
        if (previous && tasksDatesEqual(previous, task)) continue;

        const stageError = assertTaskDatesWithinStage(api, task.id, {
          start: task.start,
          end: task.end,
        });
        if (stageError) continue;

        updates.push(
          api.exec('update-task', {
            id: task.id,
            task: {
              start: task.start,
              end: task.end,
              duration: task.duration,
            },
            skipConfirm: true,
          }),
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    } finally {
      scheduling = false;
    }
  };

  const scheduleIfIdle = () => {
    if (scheduling) return;
    void apply();
  };

  api.on(
    'update-task',
    (ev: { inProgress?: boolean; task?: Partial<ITask> }) => {
      if (ev?.inProgress) return;
      const patch = ev?.task;
      if (!patch) return;
      if (!('start' in patch || 'end' in patch || 'duration' in patch)) return;
      scheduleIfIdle();
    },
    tag,
  );
  api.on('add-task', scheduleIfIdle, tag);
  api.on('add-link', scheduleIfIdle, tag);
  api.on('update-link', scheduleIfIdle, tag);
  api.on('delete-link', scheduleIfIdle, tag);

  return () => {
    api.detach(tag.tag);
  };
}
