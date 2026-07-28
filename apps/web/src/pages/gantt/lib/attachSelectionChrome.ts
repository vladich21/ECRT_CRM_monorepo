import type { IApi } from '@svar-ui/react-gantt';

import { getTaskStore, isGanttWorkTask } from './ganttTaskStore';

function isGanttEditorOpen(api: IApi): boolean {
  const state = api.getState() as {
    activeTask?: unknown;
    _activeTask?: unknown;
  };
  return state.activeTask != null || state._activeTask != null;
}

/** Клики внутри сайдбара / порталов SVAR (datepicker, combo) / меню — не закрываем. */
function isInsideEditorChrome(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return Boolean(
    target.closest('.wx-sidearea') ||
      target.closest('.wx-gantt-editor') ||
      target.closest('.wx-editor') ||
      target.closest('.wx-dropdown') ||
      target.closest('[data-wx-portal-root]') ||
      target.closest('.wx-menu') ||
      target.closest('.wx-context') ||
      target.closest('.ant-modal-root') ||
      target.closest('.ant-modal-wrap') ||
      target.closest('.ant-modal') ||
      target.closest('.ant-modal-confirm') ||
      target.closest('.ant-picker-dropdown') ||
      target.closest('.ant-select-dropdown'),
  );
}

/**
 * Клик по строке: без автоскролла к задаче и Editor только у рабочих задач.
 * Закрытие Editor — крестик / Escape / клик вне `.wx-sidearea`.
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
    (ev: { id?: string | number | null }) => {
      // SVAR Editor close: exec('show-editor', { id: null })
      if (ev?.id == null) return true;
      return isGanttWorkTask(getTaskStore(api).byId?.(ev.id));
    },
    tag,
  );

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (!isGanttEditorOpen(api)) return;
    if (isInsideEditorChrome(event.target)) return;
    void api.exec('show-editor', { id: null as unknown as string });
  };

  document.addEventListener('pointerdown', onPointerDown, true);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    api.detach(tag.tag);
  };
}
