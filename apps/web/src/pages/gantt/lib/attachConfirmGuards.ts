import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import type { IApi, ITask } from '@svar-ui/react-gantt';

import { GANTT_UI } from '../ganttFeatures';

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

type ConfirmFn = (props: ModalFuncProps) => void;

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

/**
 * Показать confirm удаления (toolbar / ПКМ / Editor / Delete).
 * setTimeout + высокий zIndex — иначе модалка оказывается под SVAR ContextMenu/dropdown.
 */
export function openGanttDeleteConfirm(
  api: IApi,
  ids: Array<string | number>,
  confirm: ConfirmFn = Modal.confirm,
): void {
  if (ids.length === 0) return;

  const { title, content } = buildDeleteCopy(api, ids);

  window.setTimeout(() => {
    confirm({
      title,
      content,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      centered: true,
      zIndex: CONFIRM_Z_INDEX,
      getContainer: () => document.body,
      onOk: async () => {
        for (const id of ids) {
          await api.exec('delete-task', { id, skipConfirm: true });
        }
      },
    });
  }, 0);
}

/**
 * Confirm на удаления и смену дат (drag на шкале / Editor).
 * Auto-schedule и внутренние патчи — с `skipConfirm: true`.
 */
export function attachConfirmGuards(api: IApi, confirm: ConfirmFn = Modal.confirm): () => void {
  const tag = { tag: 'gantt-confirm-guards' };
  api.detach(tag.tag);

  /** Исходные даты на старте drag (`inProgress`), чтобы откатить по «Отмена». */
  const dragOrigins = new Map<string, DateSnapshot>();

  api.intercept(
    'delete-task',
    (ev: ConfirmEvent) => {
      if (ev?.skipConfirm) return true;

      const ids = resolveSelectedIds(api, ev);
      if (ids.length === 0) return false;

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

      window.setTimeout(() => {
        confirm({
          title: 'Удалить связь?',
          content: 'Связь между задачами будет удалена.',
          okText: 'Удалить',
          cancelText: 'Отмена',
          okButtonProps: { danger: true },
          centered: true,
          zIndex: CONFIRM_Z_INDEX,
          getContainer: () => document.body,
          onOk: () => api.exec('delete-link', { ...ev, id, skipConfirm: true }),
        });
      }, 0);
      return false;
    },
    tag,
  );

  api.intercept(
    'update-task',
    (ev: ConfirmEvent & { task?: Partial<ITask> }) => {
      if (!GANTT_UI.dateChangeConfirm) return true;
      if (ev?.skipConfirm) return true;
      if (!patchTouchesDates(ev?.task)) return true;

      const id = ev?.id;
      if (id == null) return true;

      const key = String(id);
      const current = getTaskSafe(api, id);

      // Drag preview — пускаем, запоминаем старт один раз
      if (ev.inProgress) {
        if (!dragOrigins.has(key)) {
          dragOrigins.set(key, snapshotDates(current));
        }
        return true;
      }

      const before = dragOrigins.get(key) ?? snapshotDates(current);
      dragOrigins.delete(key);

      const after = mergeDatePatch(before, ev.task);
      if (!datesChanged(before, after)) return true;

      const label = current?.text ? `«${current.text}»` : `ID ${id}`;

      window.setTimeout(() => {
        confirm({
          title: 'Изменить даты задачи?',
          content: `${label}: ${formatDateRange(before)} → ${formatDateRange(after)}. Последователи со связью «Окончание — начало» могут сдвинуться автоматически.`,
          okText: 'Изменить',
          cancelText: 'Отмена',
          centered: true,
          zIndex: CONFIRM_Z_INDEX,
          getContainer: () => document.body,
          onOk: () =>
            api.exec('update-task', {
              ...ev,
              id,
              task: ev.task,
              skipConfirm: true,
            }),
          onCancel: () => {
            void api.exec('update-task', {
              id,
              task: {
                start: before.start,
                end: before.end,
                duration: before.duration,
              },
              skipConfirm: true,
            });
          },
        });
      }, 0);

      return false;
    },
    tag,
  );

  return () => {
    dragOrigins.clear();
    api.detach(tag.tag);
  };
}
