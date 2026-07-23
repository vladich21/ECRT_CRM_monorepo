import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import type { IApi, ITask } from '@svar-ui/react-gantt';

type ConfirmEvent = {
  id?: string | number;
  ids?: Array<string | number>;
  task?: ITask;
  target?: string | number;
  mode?: string;
  skipConfirm?: boolean;
};

type GanttTask = ITask & {
  entityKind?: string;
  data?: unknown[];
};

type ConfirmFn = (props: ModalFuncProps) => void;

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
 * Confirm на удаления в Gantt: задачи (toolbar / ПКМ / Delete / Backspace / Editor) и связи.
 */
export function attachConfirmGuards(api: IApi, confirm: ConfirmFn = Modal.confirm): () => void {
  const tag = { tag: 'gantt-confirm-guards' };
  api.detach(tag.tag);

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

  return () => {
    api.detach(tag.tag);
  };
}
