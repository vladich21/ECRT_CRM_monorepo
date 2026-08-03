import type { IApi } from '@svar-ui/react-gantt';

import { isGanttDomainEntityKind } from '../ganttTaskTypes';
import type { GanttStoreTask } from './ganttTaskStore';

export const GANTT_DOMAIN_BAR_CLASS = 'gantt-domain-bar';

export function stampDomainBarClasses(api: IApi, root: HTMLElement | null): void {
  if (!root) return;

  let tasks: GanttStoreTask[];
  try {
    tasks = api.serialize() as GanttStoreTask[];
  } catch {
    return;
  }

  for (const task of tasks) {
    if (task.id == null || !isGanttDomainEntityKind(task.entityKind)) continue;
    const id = CSS.escape(String(task.id));
    root.querySelectorAll(`.wx-bar[data-id="${id}"]`).forEach(el => {
      el.classList.add(GANTT_DOMAIN_BAR_CLASS);
    });
  }
}

/** Проставляет gantt-domain-bar на полоски проекта/договора/этапа (SVAR: wx-task + domain). */
export function attachDomainBarStyle(api: IApi, root: HTMLElement | null): () => void {
  const tag = { tag: 'gantt-domain-bar-style' };
  api.detach(tag.tag);

  let frame = 0;
  const schedule = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      stampDomainBarClasses(api, root);
    });
  };

  schedule();

  for (const event of [
    'update-task',
    'add-task',
    'delete-task',
    'drag-task',
    'copy-task',
    'paste-task',
    'move-task',
    'indent-task',
  ] as const) {
    api.on(event, schedule, tag);
  }

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    api.detach(tag.tag);
  };
}
