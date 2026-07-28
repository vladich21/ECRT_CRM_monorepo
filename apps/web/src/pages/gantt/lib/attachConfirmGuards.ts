import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import { createElement } from 'react';
import type { IApi, ITask } from '@svar-ui/react-gantt';

import { USE_GANTT_MOCKS } from '../ganttConfig';
import { GANTT_UI } from '../ganttFeatures';
import { isGanttLeafTask, isGanttWorkTask } from './ganttTaskStore';
import { assertTaskDatesWithinStage } from './stageDateBounds';

type ConfirmEvent = {
  id?: string | number;
  ids?: Array<string | number>;
  task?: ITask;
  target?: string | number;
  mode?: string;
  skipConfirm?: boolean;
  inProgress?: boolean;
};

type GanttTask = ITask & {
  entityKind?: string;
  data?: unknown[];
};

type ConfirmFn = (props: ModalFuncProps) => { destroy: () => void } | void;

type DateSnapshot = {
  start?: Date;
  end?: Date;
  duration?: number;
};

const CONFIRM_Z_INDEX = 11000;

const ENTITY_LABELS: Record<string, { title: string }> = {
  project: { title: 'Удалить проект?' },
  contract: { title: 'Удалить договор?' },
  stage: { title: 'Удалить этап?' },
  workPackage: { title: 'Удалить пакет работ?' },
  task: { title: 'Удалить задачу?' },
};

function resolveSelectedIds(api: IApi, ev: ConfirmEvent): Array<string | number> {
  if (ev.id != null) return [ev.id];
  if (Array.isArray(ev.ids) && ev.ids.length > 0) return ev.ids;

  const selected = api.getState().selected as unknown;
  if (!Array.isArray(selected) || selected.length === 0) return [];

  return selected
    .map(item => {
      if (item && typeof item === 'object' && 'id' in item) {
        return (item as { id?: string | number }).id;
      }
      return item as string | number;
    })
    .filter((id): id is string | number => id != null);
}

function getTaskSafe(api: IApi, id: string | number): GanttTask | undefined {
  try {
    return api.getTask?.(id) as GanttTask | undefined;
  } catch {
    const tasks = api.getState().tasks as { byId?: (xid: string | number) => GanttTask };
    return tasks?.byId?.(id);
  }
}

function buildDeleteCopy(api: IApi, ids: Array<string | number>) {
  const tasks = ids.map(id => getTaskSafe(api, id));
  const labels = tasks.map((task, index) =>
    task?.text ? `«${task.text}»` : `ID ${ids[index]}`,
  );

  const hasChildren = tasks.some(task => Array.isArray(task?.data) && task.data.length > 0);
  const kind = tasks.length === 1 ? tasks[0]?.entityKind : undefined;
  const entity = kind ? ENTITY_LABELS[kind] : undefined;

  const title =
    ids.length === 1
      ? (entity?.title ?? 'Удалить элемент?')
      : `Удалить элементы (${ids.length})?`;

  const content =
    ids.length === 1
      ? `${labels[0]} будет удалён безвозвратно.${
          hasChildren ? ' Вместе с вложенными элементами.' : ''
        }`
      : `Будут удалены ${ids.length} элемент(ов):\n${labels.slice(0, 5).join(', ')}${
          labels.length > 5 ? '…' : ''
        }${hasChildren ? '\nВ том числе с вложенными элементами.' : ''}`;

  return { title, content };
}

function dayKey(value: Date | undefined | null): number | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

function cloneDate(value: Date | undefined | null): Date | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
  return new Date(value.getTime());
}

function snapshotDates(task: GanttTask | undefined): DateSnapshot {
  return {
    start: cloneDate(task?.start),
    end: cloneDate(task?.end),
    duration: typeof task?.duration === 'number' ? task.duration : undefined,
  };
}

function mergeDatePatch(base: DateSnapshot, patch: Partial<ITask> | undefined): DateSnapshot {
  const next: DateSnapshot = { ...base };
  if (!patch) return next;
  if ('start' in patch) next.start = cloneDate(patch.start as Date | undefined);
  if ('end' in patch) next.end = cloneDate(patch.end as Date | undefined);
  if ('duration' in patch) {
    next.duration = typeof patch.duration === 'number' ? patch.duration : undefined;
  }
  return next;
}

function datesChanged(before: DateSnapshot, after: DateSnapshot): boolean {
  return (
    dayKey(before.start) !== dayKey(after.start)
    || dayKey(before.end) !== dayKey(after.end)
    || (before.duration ?? null) !== (after.duration ?? null)
  );
}

function formatDateRu(value: Date | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '—';
  return value.toLocaleDateString('ru-RU');
}

function formatDateRange(snapshot: DateSnapshot): string {
  return `${formatDateRu(snapshot.start)} – ${formatDateRu(snapshot.end)}`;
}

function patchTouchesDates(patch: Partial<ITask> | undefined): boolean {
  if (!patch) return false;
  return 'start' in patch || 'end' in patch || 'duration' in patch;
}

function isStructuralEntity(task: GanttTask | undefined): boolean {
  return Boolean(task?.entityKind && !isGanttWorkTask(task));
}

function runConfirm(confirm: ConfirmFn, props: ModalFuncProps): void {
  window.setTimeout(() => {
    confirm({
      centered: true,
      zIndex: CONFIRM_Z_INDEX,
      getContainer: () => document.body,
      maskClosable: true,
      keyboard: true,
      ...props,
    });
  }, 100);
}

function openInfoModal(confirm: ConfirmFn, title: string, content: string, onClose?: () => void): void {
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    onClose?.();
  };
  runConfirm(confirm, {
    title,
    content,
    okText: 'Понятно',
    cancelText: 'Отмена',
    onOk: () => {
      finish();
    },
    onCancel: () => {
      finish();
    },
    afterClose: () => {
      finish();
    },
  });
}

export function openGanttDeleteConfirm(
  api: IApi,
  ids: Array<string | number>,
  confirm: ConfirmFn = Modal.confirm,
): void {
  if (ids.length === 0) return;

  const { title, content } = buildDeleteCopy(api, ids);

  runConfirm(confirm, {
    title,
    content,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    onOk: () => {
      void (async () => {
        for (const id of ids) {
          await api.exec('delete-task', { id, skipConfirm: true });
        }
      })();
    },
  });
}

/**
 * Confirm-логика Ганта.
 *
 * «Изменить даты задачи?» — только drag полоски рабочей задачи.
 * Полоски project/contract/stage — тихо блокируются (без модалки).
 */
export function attachConfirmGuards(api: IApi, confirm: ConfirmFn = Modal.confirm): () => void {
  const tag = { tag: 'gantt-confirm-guards' };
  api.detach(tag.tag);

  const dragOrigins = new Map<string, DateSnapshot>();
  let dateConfirmOpen = false;

  api.intercept(
    'delete-task',
    (ev: ConfirmEvent) => {
      const ids = resolveSelectedIds(api, ev);
      if (ids.length === 0) return false;

      if (!USE_GANTT_MOCKS && ids.some(id => isStructuralEntity(getTaskSafe(api, id)))) {
        if (!ev?.skipConfirm) {
          openInfoModal(
            confirm,
            'Удаление недоступно',
            'Проекты, договоры и этапы нельзя удалить из диаграммы Ганта. Используйте соответствующие разделы системы.',
          );
        }
        return false;
      }

      if (ev?.skipConfirm) return true;

      openGanttDeleteConfirm(api, ids, confirm);
      return false;
    },
    tag,
  );

  api.intercept(
    'delete-link',
    (ev: ConfirmEvent) => {
      if (ev?.skipConfirm) return true;

      const id = ev?.id;
      if (id == null) return false;

      runConfirm(confirm, {
        title: 'Удалить связь?',
        content: 'Связь между задачами будет удалена.',
        okText: 'Удалить',
        cancelText: 'Отмена',
        okButtonProps: { danger: true },
        onOk: () => {
          void api.exec('delete-link', { ...ev, id, skipConfirm: true });
        },
      });
      return false;
    },
    tag,
  );

  // Project / contract / stage / parent-summary — полоску не двигаем.
  api.intercept(
    'drag-task',
    (ev: { id?: string | number; top?: number }) => {
      if (ev?.id == null) return true;
      if (typeof ev.top !== 'undefined') return true;
      const task = getTaskSafe(api, ev.id);
      if (!isGanttLeafTask(task)) return false;
      return true;
    },
    tag,
  );

  // Стрелки связей: только между листовыми задачами.
  api.intercept(
    'add-link',
    (ev: { link?: { source?: string | number; target?: string | number; type?: string } }) => {
      const sourceId = ev?.link?.source;
      const targetId = ev?.link?.target;
      if (sourceId == null || targetId == null) return false;

      const source = getTaskSafe(api, sourceId);
      const target = getTaskSafe(api, targetId);
      if (!isGanttLeafTask(source) || !isGanttLeafTask(target)) {
        openInfoModal(
          confirm,
          'Связь недоступна',
          'Связи (стрелки) можно строить только между задачами. Этап, договор и проект в связи не участвуют.',
        );
        return false;
      }
      return true;
    },
    tag,
  );

  api.intercept(
    'update-task',
    (ev: ConfirmEvent & { task?: Partial<ITask> }) => {
      if (!GANTT_UI.dateChangeConfirm) return true;

      const id = ev?.id;
      const current = id != null ? getTaskSafe(api, id) : undefined;
      const touchesDates = patchTouchesDates(ev?.task);
      const touchesProgress = Boolean(ev?.task && 'progress' in ev.task);

      // Progress — только %. Иногда SVAR в том же патче шлёт даты → отбрасываем их.
      if (touchesProgress) {
        if (!isGanttLeafTask(current)) return false;
        if (touchesDates && ev.task) {
          delete ev.task.start;
          delete ev.task.end;
          delete ev.task.duration;
        }
        return true;
      }

      // Любые summary (проект/договор/этап/родительская задача) — даты не с шкалы.
      if (touchesDates && current && !isGanttLeafTask(current)) {
        return false;
      }

      if (ev?.skipConfirm) return true;
      if (!touchesDates) return true;
      if (id == null) return true;

      const key = String(id);

      if (!isGanttLeafTask(current)) {
        return false;
      }

      if (ev.inProgress) {
        if (!dragOrigins.has(key)) {
          dragOrigins.set(key, snapshotDates(current));
        }
        return true;
      }

      const wasDrag = dragOrigins.has(key);
      const before = dragOrigins.get(key) ?? snapshotDates(current);
      dragOrigins.delete(key);

      const after = mergeDatePatch(before, ev.task);
      if (!datesChanged(before, after)) return true;

      const applyDates = (snapshot: DateSnapshot) => {
        void api.exec('update-task', {
          id,
          task: {
            start: snapshot.start,
            end: snapshot.end,
            duration: snapshot.duration,
          },
          skipConfirm: true,
        });
      };

      const stageError = assertTaskDatesWithinStage(api, id, after);
      if (stageError) {
        // Всегда откатываем (drag / Editor / грид) — иначе полоска или форма остаются «за сроком».
        applyDates(before);
        void api.exec('show-editor', { id: null as unknown as string });
        if (!dateConfirmOpen) {
          dateConfirmOpen = true;
          openInfoModal(
            confirm,
            'Даты вне срока этапа',
            `${stageError}\n\n«Срок» этапа задаётся в карточке этапа. «Окончание» задачи должно укладываться в этот срок.`,
            () => {
              dateConfirmOpen = false;
            },
          );
        }
        return false;
      }

      if (!wasDrag) return true;

      if (dateConfirmOpen) {
        applyDates(before);
        return false;
      }

      dateConfirmOpen = true;
      const label = current?.text ? `«${current.text}»` : `ID ${id}`;
      let settled = false;
      const finish = (snapshot: DateSnapshot) => {
        if (settled) return;
        settled = true;
        applyDates(snapshot);
        dateConfirmOpen = false;
      };

      runConfirm(confirm, {
        title: 'Сместить даты задачи?',
        content: createElement(
          'div',
          { style: { whiteSpace: 'pre-line' } },
          `${label}\n\nС: ${formatDateRange(before)}\nНа: ${formatDateRange(after)}\n\nПоследователи со связью «Окончание — начало» сдвинутся только если связь их вынуждает.`,
        ),
        okText: 'Применить',
        cancelText: 'Отмена',
        onOk: () => {
          finish(after);
        },
        onCancel: () => {
          finish(before);
        },
        afterClose: () => {
          // Escape / маска — как Отмена.
          if (!settled) finish(before);
          else dateConfirmOpen = false;
        },
      });

      return false;
    },
    tag,
  );

  return () => {
    dragOrigins.clear();
    dateConfirmOpen = false;
    api.detach(tag.tag);
  };
}
