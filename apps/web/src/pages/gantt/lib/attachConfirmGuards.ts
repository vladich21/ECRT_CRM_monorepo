import { Modal } from 'antd';
import { createElement } from 'react';
import type { IApi, ITask } from '@svar-ui/react-gantt';

import { USE_GANTT_MOCKS } from '../ganttConfig';
import { GANTT_UI } from '../ganttFeatures';
import {
  type GanttConfirmFn,
  openGanttInfoModal,
  runGanttConfirm,
} from './ganttConfirm';
import { dayKey, formatDateRu } from './ganttDates';
import {
  applyGanttTaskDates,
  patchTouchesTaskDates,
  snapshotTaskDates,
  type TaskDateSnapshot,
} from './ganttTaskDatePatch';
import {
  closeGanttEditor,
  getGanttTask,
  isGanttLeafTask,
  isGanttWorkTask,
  type GanttStoreTask,
} from './ganttTaskStore';
import { assertTaskDatesWithinStage, getStageDeadlineBounds } from './stageDateBounds';

type ConfirmEvent = {
  id?: string | number;
  ids?: Array<string | number>;
  task?: ITask;
  skipConfirm?: boolean;
  inProgress?: boolean;
};

type DateSnapshot = TaskDateSnapshot;

function snapshotDates(task: GanttStoreTask | undefined): DateSnapshot {
  return snapshotTaskDates(task);
}

function mergeDatePatch(base: DateSnapshot, patch: Partial<ITask> | undefined): DateSnapshot {
  const next: DateSnapshot = { ...base };
  if (!patch) return next;
  if ('start' in patch) next.start = snapshotTaskDates({ start: patch.start as Date }).start;
  if ('end' in patch) next.end = snapshotTaskDates({ end: patch.end as Date }).end;
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

function formatDateRange(snapshot: DateSnapshot): string {
  return `${formatDateRu(snapshot.start)} – ${formatDateRu(snapshot.end)}`;
}

function isStructuralEntity(task: GanttStoreTask | undefined): boolean {
  return Boolean(task?.entityKind && !isGanttWorkTask(task));
}

function applyTaskDates(api: IApi, id: string | number, snapshot: DateSnapshot): void {
  applyGanttTaskDates(api, id, snapshot);
}

const ENTITY_LABELS: Record<string, string> = {
  project: 'Удалить проект?',
  contract: 'Удалить договор?',
  stage: 'Удалить этап?',
  workPackage: 'Удалить пакет работ?',
  task: 'Удалить задачу?',
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

function buildDeleteCopy(api: IApi, ids: Array<string | number>) {
  const tasks = ids.map(id => getGanttTask(api, id));
  const labels = tasks.map((task, index) =>
    task?.text ? `«${task.text}»` : `ID ${ids[index]}`,
  );
  const hasChildren = tasks.some(
    task => Array.isArray((task as GanttStoreTask & { data?: unknown[] })?.data)
      && ((task as GanttStoreTask & { data?: unknown[] }).data?.length ?? 0) > 0,
  );
  const kind = tasks.length === 1 ? tasks[0]?.entityKind : undefined;

  const title =
    ids.length === 1
      ? (kind ? ENTITY_LABELS[kind] : undefined) ?? 'Удалить элемент?'
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

export function openGanttDeleteConfirm(
  api: IApi,
  ids: Array<string | number>,
  confirm: GanttConfirmFn = Modal.confirm,
): void {
  if (ids.length === 0) return;

  const { title, content } = buildDeleteCopy(api, ids);

  runGanttConfirm(confirm, {
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

function openStageExceedConfirm(
  confirm: GanttConfirmFn,
  opts: {
    api: IApi;
    id: string | number;
    label: string;
    before: DateSnapshot;
    after: DateSnapshot;
    stageError: string;
    onSettled: () => void;
  },
): void {
  const bounds = getStageDeadlineBounds(opts.api, opts.id);
  const stageRange = bounds
    ? `${formatDateRu(bounds.start)} – ${formatDateRu(bounds.end)}`
    : '—';

  let settled = false;
  const finish = (snapshot: DateSnapshot) => {
    if (settled) return;
    settled = true;
    applyTaskDates(opts.api, opts.id, snapshot);
    opts.onSettled();
  };

  runGanttConfirm(confirm, {
    title: 'Даты выходят за срок этапа',
    content: createElement(
      'div',
      { style: { whiteSpace: 'pre-line' } },
      `${opts.label}\n\nПеренести с ${formatDateRange(opts.before)} на ${formatDateRange(opts.after)}?\n\nСрок этапа: ${stageRange}.\n${opts.stageError}`,
    ),
    okText: 'Продолжить',
    cancelText: 'Отмена',
    onOk: () => finish(opts.after),
    onCancel: () => finish(opts.before),
    afterClose: () => {
      if (!settled) finish(opts.before);
      else opts.onSettled();
    },
  });
}

/**
 * Confirm / guard-логика Ганта.
 * Drag leaf → confirm; progress → только %; summary bars — не двигаются.
 */
export function attachConfirmGuards(api: IApi, confirm: GanttConfirmFn = Modal.confirm): () => void {
  const tag = { tag: 'gantt-confirm-guards' };
  api.detach(tag.tag);

  const dragOrigins = new Map<string, DateSnapshot>();
  let dateConfirmOpen = false;

  api.intercept(
    'delete-task',
    (ev: ConfirmEvent) => {
      const ids = resolveSelectedIds(api, ev);
      if (ids.length === 0) return false;

      if (!USE_GANTT_MOCKS && ids.some(id => isStructuralEntity(getGanttTask(api, id)))) {
        if (!ev?.skipConfirm) {
          openGanttInfoModal(
            confirm,
            'Удаление недоступно',
            'Проекты, договоры и этапы нельзя удалить из диаграммы Ганта. Используйте соответствующие разделы системы.',
          );
        }
        return false;
      }

      if (
        !USE_GANTT_MOCKS &&
        ids.some(id => (getGanttTask(api, id) as { isAutoAuxiliary?: boolean })?.isAutoAuxiliary)
      ) {
        if (!ev?.skipConfirm) {
          openGanttInfoModal(
            confirm,
            'Удаление недоступно',
            'Системную задачу «Вспомогательная» нельзя удалить вручную.',
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

      runGanttConfirm(confirm, {
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

  api.intercept(
    'drag-task',
    (ev: { id?: string | number; top?: number }) => {
      if (ev?.id == null || typeof ev.top !== 'undefined') return true;
      return isGanttLeafTask(getGanttTask(api, ev.id));
    },
    tag,
  );

  api.intercept(
    'add-link',
    (ev: { link?: { source?: string | number; target?: string | number } }) => {
      const sourceId = ev?.link?.source;
      const targetId = ev?.link?.target;
      if (sourceId == null || targetId == null) return false;

      const source = getGanttTask(api, sourceId);
      const target = getGanttTask(api, targetId);
      if (!isGanttLeafTask(source) || !isGanttLeafTask(target)) {
        openGanttInfoModal(
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
      const current = id != null ? getGanttTask(api, id) : undefined;
      const touchesDates = patchTouchesTaskDates(ev?.task);
      const touchesProgress = Boolean(ev?.task && 'progress' in ev.task);

      // Progress: только %. SVAR иногда кладёт даты в тот же патч — отбрасываем.
      if (touchesProgress) {
        if (!isGanttLeafTask(current)) return false;
        if (touchesDates && ev.task) {
          delete ev.task.start;
          delete ev.task.end;
          delete ev.task.duration;
        }
        return true;
      }

      if (touchesDates && current && !isGanttLeafTask(current)) return false;
      if (ev?.skipConfirm) return true;
      if (!touchesDates || id == null) return true;
      if (!isGanttLeafTask(current)) return false;

      const key = String(id);

      if (ev.inProgress) {
        if (!dragOrigins.has(key)) dragOrigins.set(key, snapshotDates(current));
        return true;
      }

      const wasDrag = dragOrigins.has(key);
      const before = dragOrigins.get(key) ?? snapshotDates(current);
      dragOrigins.delete(key);

      const after = mergeDatePatch(before, ev.task);
      if (!datesChanged(before, after)) return true;

      const stageError = assertTaskDatesWithinStage(api, id, after);
      const label = current?.text ? `«${current.text}»` : `ID ${id}`;

      if (stageError) {
        if (dateConfirmOpen) {
          applyTaskDates(api, id, before);
          return false;
        }
        dateConfirmOpen = true;
        closeGanttEditor(api);
        openStageExceedConfirm(confirm, {
          api,
          id,
          label,
          before,
          after,
          stageError,
          onSettled: () => {
            dateConfirmOpen = false;
          },
        });
        return false;
      }

      if (!wasDrag) return true;

      if (dateConfirmOpen) {
        applyTaskDates(api, id, before);
        return false;
      }

      dateConfirmOpen = true;
      let settled = false;
      const finish = (snapshot: DateSnapshot) => {
        if (settled) return;
        settled = true;
        applyTaskDates(api, id, snapshot);
        dateConfirmOpen = false;
      };

      runGanttConfirm(confirm, {
        title: 'Сместить даты задачи?',
        content: createElement(
          'div',
          { style: { whiteSpace: 'pre-line' } },
          `${label}\n\nС: ${formatDateRange(before)}\nНа: ${formatDateRange(after)}\n\nПоследователи со связью «Окончание — начало» сдвинутся только если связь их вынуждает.`,
        ),
        okText: 'Применить',
        cancelText: 'Отмена',
        onOk: () => finish(after),
        onCancel: () => finish(before),
        afterClose: () => {
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
