import { Modal } from 'antd';
import type { IApi, ITask } from '@svar-ui/react-gantt';

import {
  type GanttConfirmFn,
  openGanttInfoModal,
  runGanttConfirm,
} from './ganttConfirm';
import {
  getGanttTask,
  isGanttLeafTask,
  isGanttWorkTask,
  type GanttStoreTask,
} from './ganttTaskStore';

type ConfirmEvent = {
  id?: string | number;
  ids?: Array<string | number>;
  task?: ITask;
  skipConfirm?: boolean;
};

function isStructuralEntity(task: GanttStoreTask | undefined): boolean {
  return Boolean(task?.entityKind && !isGanttWorkTask(task));
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

/** Confirm удаления / связей / add-link. Проверка срока этапа — attachStageExceedGuard. */
export function attachConfirmGuards(api: IApi, confirm: GanttConfirmFn = Modal.confirm): () => void {
  const tag = { tag: 'gantt-confirm-guards' };
  api.detach(tag.tag);

  api.intercept(
    'delete-task',
    (ev: ConfirmEvent) => {
      const ids = resolveSelectedIds(api, ev);
      if (ids.length === 0) return false;

      if (ids.some(id => isStructuralEntity(getGanttTask(api, id)))) {
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

  return () => {
    api.detach(tag.tag);
  };
}
