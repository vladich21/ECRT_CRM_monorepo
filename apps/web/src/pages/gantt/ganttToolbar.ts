import { message } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import { getToolbarButtons, type IApi } from '@svar-ui/react-gantt';

import { openGanttDeleteConfirm } from './lib/attachConfirmGuards';

/** Кнопки, которые ломают доменную иерархию — убираем из toolbar. */
const HIDDEN_TOOLBAR_IDS = new Set([
  'add-task',
  'move-task:up',
  'move-task:down',
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

/**
 * Toolbar: edit / delete / copy / cut / paste (+ undo).
 * Без ↑↓ и indent — они нарушают Project→Contract→Stage→Task.
 */
export function createGanttToolbarItems(
  getApi: () => IApi | null,
  confirm?: (props: ModalFuncProps) => void,
) {
  const buttons = getToolbarButtons({ undo: true });

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
