import { message } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import { getToolbarButtons, type IApi } from '@svar-ui/react-gantt';

import { openGanttDeleteConfirm } from './lib/attachConfirmGuards';

/**
 * Скрываем только то, что ломает Project→Contract→Stage→Task:
 * «Новая задача» (создаём через ПКМ) и indent (меняет родителя).
 * ↑↓ оставляем — это порядок среди siblings, guard уже проверяет.
 */
const HIDDEN_TOOLBAR_IDS = new Set([
  'add-task',
  'indent-task:add',
  'indent-task:remove',
]);

function getSelectedIds(api: IApi | null | undefined): Array<string | number> {
  if (!api) return [];
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

function getSelectedId(api: IApi | null | undefined): string | number | null {
  return getSelectedIds(api)[0] ?? null;
}

function isSeparator(button: unknown): boolean {
  return Boolean(button && typeof button === 'object' && 'comp' in button && button.comp === 'separator');
}

function canMoveUp(api: IApi | null | undefined, taskId: string | number | null | undefined): boolean {
  if (!api || taskId == null) return false;
  try {
    const tasks = api.getState().tasks as {
      byId?: (id: string | number) => { parent?: unknown } | undefined;
      getIndexById?: (id: string | number) => number;
    };
    if (!tasks.byId?.(taskId)) return false;
    const index = tasks.getIndexById?.(taskId);
    return typeof index === 'number' && index > 0;
  } catch {
    return false;
  }
}

function canMoveDown(api: IApi | null | undefined, taskId: string | number | null | undefined): boolean {
  if (!api || taskId == null) return false;
  try {
    const tasks = api.getState().tasks as {
      byId?: (id: string | number) => { parent?: unknown } | undefined;
      getBranch?: (id: string | number) => unknown[];
      getIndexById?: (id: string | number) => number;
    };
    if (!tasks.byId?.(taskId)) return false;
    const branch = tasks.getBranch?.(taskId);
    const index = tasks.getIndexById?.(taskId);
    return Boolean(branch && typeof index === 'number' && index >= 0 && index < branch.length - 1);
  } catch {
    return false;
  }
}

/**
 * Toolbar: edit / delete / ↑↓ / copy / cut / paste.
 * Без indent и «Новая задача» — иерархию не ломаем.
 * ↑↓ disabled на краях ветки (иначе SVAR выносит на уровень родителя).
 */
export function createGanttToolbarItems(
  getApi: () => IApi | null,
  confirm?: (props: ModalFuncProps) => void,
) {
  // В MIT-версии getToolbarButtons игнорирует конфиг, кнопок undo/redo в наборе нет.
  const buttons = getToolbarButtons();

  const filtered = buttons.filter(button => {
    if (!button || typeof button !== 'object') return true;
    if ('id' in button && button.id != null && HIDDEN_TOOLBAR_IDS.has(String(button.id))) {
      return false;
    }
    return true;
  });

  // убрать подряд идущие / краевые separators
  const cleaned: typeof buttons = [];
  for (const button of filtered) {
    if (isSeparator(button)) {
      if (cleaned.length === 0) continue;
      if (isSeparator(cleaned[cleaned.length - 1])) continue;
      cleaned.push(button);
    } else {
      cleaned.push(button);
    }
  }
  while (cleaned.length > 0 && isSeparator(cleaned[cleaned.length - 1])) {
    cleaned.pop();
  }

  return cleaned.map(button => {
    if (!button || typeof button !== 'object' || !('id' in button)) return button;

    if (button.id === 'move-task:up') {
      return {
        ...button,
        menuText: 'Выше',
        isDisabled: (task: { id?: string | number } | null) =>
          !canMoveUp(getApi(), task?.id ?? getSelectedId(getApi())),
      };
    }

    if (button.id === 'move-task:down') {
      return {
        ...button,
        menuText: 'Ниже',
        isDisabled: (task: { id?: string | number } | null) =>
          !canMoveDown(getApi(), task?.id ?? getSelectedId(getApi())),
      };
    }

    if (button.id === 'delete-task') {
      return {
        ...button,
        // свой id — иначе SVAR перезапишет handler через isHandledAction
        id: 'gantt-confirm-delete',
        css: 'gantt-toolbar-delete',
        menuText: 'Удалить',
        handler: () => {
          const api = getApi();
          const ids = getSelectedIds(api);
          if (!api || ids.length === 0) {
            message.warning('Сначала выберите элемент');
            return;
          }
          openGanttDeleteConfirm(api, ids, confirm);
        },
      };
    }

    if (button.id === 'cut-task') {
      return {
        ...button,
        menuText: 'Вырезать',
        handler: () => {
          const api = getApi();
          const id = getSelectedId(api);
          if (!api || id == null) {
            message.warning('Сначала выберите задачу');
            return;
          }
          void api.exec('cut-task', { id });
          message.success('Вырезано — вставьте через «Вставить» или Ctrl+V');
        },
      };
    }

    if (button.id === 'copy-task') {
      return {
        ...button,
        handler: () => {
          const api = getApi();
          const id = getSelectedId(api);
          if (!api || id == null) {
            message.warning('Сначала выберите задачу');
            return;
          }
          void api.exec('copy-task', { id });
          message.success('Скопировано — вставьте через «Вставить» или Ctrl+V');
        },
      };
    }

    if (button.id === 'paste-task') {
      return {
        ...button,
        handler: () => {
          const api = getApi();
          const id = getSelectedId(api);
          if (!api) return;
          if (id == null) {
            message.warning('Выберите место вставки (строку)');
            return;
          }
          void api.exec('paste-task', { id });
        },
      };
    }

    return button;
  }) as typeof buttons;
}
