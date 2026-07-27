import { getMenuOptions, type ITask } from '@svar-ui/react-gantt';

type MenuItem = {
  id?: string;
  type?: string;
  text?: string;
  data?: MenuItem[];
  [key: string]: unknown;
};

type GanttTask = ITask & {
  entityKind?: string;
};

const HIDDEN_MENU_ROOT_IDS = new Set([
  'convert-task',
  'move-task',
  'indent-task:add',
  'indent-task:remove',
]);

/**
 * ПКМ: задачи только внутри этапа / work package / как подзадачи у задачи.
 * Проект и договор через меню не создаём (иерархия домена с бэка / моков).
 * «Преобразовать в» / move / indent скрыты — путают с доменными типами.
 */
export function createGanttContextMenuOptions(): MenuItem[] {
  const options = getMenuOptions({ splitTasks: false }) as MenuItem[];

  return options
    .map(item => {
      if (item.id === 'add-task' && item.data) {
        return {
          ...item,
          text: 'Добавить',
          data: item.data.map(sub => {
            if (sub.id === 'add-task:child') return { ...sub, text: 'Задачу / подзадачу' };
            if (sub.id === 'add-task:before') return { ...sub, text: 'Задачу выше' };
            if (sub.id === 'add-task:after') return { ...sub, text: 'Задачу ниже' };
            return sub;
          }),
        };
      }
      return item;
    })
    .filter(item => item.id == null || !HIDDEN_MENU_ROOT_IDS.has(String(item.id)));
}

/** Фильтр пунктов ПКМ по entityKind. */
export function filterGanttContextMenu(
  option: { id?: string | number },
  task?: GanttTask,
): boolean {
  if (!task || option?.id == null) return true;

  const id = String(option.id);
  const kind = task.entityKind;

  if (
    id.startsWith('move-task') ||
    id.startsWith('indent-task') ||
    id.startsWith('convert-task')
  ) {
    return false;
  }

  if (kind === 'project' || kind === 'contract') {
    return !id.startsWith('add-task');
  }

  if (kind === 'stage' || kind === 'workPackage') {
    return id !== 'add-task:before' && id !== 'add-task:after';
  }

  return true;
}
