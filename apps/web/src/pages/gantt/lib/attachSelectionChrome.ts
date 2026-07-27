import type { IApi } from '@svar-ui/react-gantt';

import { getTaskStore, isGanttWorkTask } from './ganttTaskStore';

/**
 * Клик по строке: без автоскролла к задаче и Editor только у рабочих задач.
 */
export function attachSelectionChrome(api: IApi): () => void {
  const tag = { tag: 'gantt-selection-chrome' };
  api.detach(tag.tag);

  api.intercept(
    'select-task',
    (ev: { show?: boolean | string }) => {
      if (ev) ev.show = false;
      return true;
    },
    tag,
  );

  api.intercept(
    'show-editor',
    (ev: { id?: string | number }) => {
      if (ev?.id == null) return false;
      return isGanttWorkTask(getTaskStore(api).byId?.(ev.id));
    },
    tag,
  );

  return () => {
    api.detach(tag.tag);
  };
}
