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

/**
 * ПКМ: задачи только внутри этапа / work package / как подзадачи у задачи.
 * Проект и договор через меню не создаём (иерархия домена с бэка / моков).
 * «Преобразовать в» скрыто — путает с доменными типами Project/Contract/Stage.
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
    .filter(item => item.id !== 'convert-task' && item.id !== 'move-task')
    .filter(item => item.id !== 'indent-task:add' && item.id !== 'indent-task:remove');
}

/** Фильтр пунктов ПКМ по entityKind. */
export function filterGanttContextMenu(option: { id?: string | number }, task?: GanttTask): boolean {
  if (!task || option?.id == null) return true;

  const kind = task.entityKind;
  const id = String(option.id);

  // Move / indent убраны — иерархия только через правила домена
  if (id.startsWith('move-task') || id.startsWith('indent-task')) return false;

  // Проект / договор — без создания детей
  if (kind === 'project' || kind === 'contract') {
    if (id.startsWith('add-task')) return false;
    if (id.startsWith('convert-task')) return false;
    return true;
  }

  // Этап — только дочерняя задача
  if (kind === 'stage') {
    if (id === 'add-task:before' || id === 'add-task:after') return false;
    if (id.startsWith('convert-task')) return false;
    return true;
  }

  // Пакет работ — можно добавить дочернюю задачу
  if (kind === 'workPackage') {
    if (id === 'add-task:before' || id === 'add-task:after') return false;
    if (id.startsWith('convert-task')) return false;
    return true;
  }

  // Задача — подзадача / соседние задачи
  if (kind === 'task') {
    if (id.startsWith('convert-task')) return false;
    return true;
  }

  if (id.startsWith('convert-task')) return false;
  return true;
}
