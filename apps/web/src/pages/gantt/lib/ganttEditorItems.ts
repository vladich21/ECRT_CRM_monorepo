import { defaultEditorItems } from '@svar-ui/react-gantt';

import { TASK_CLASS_LABELS } from '../ganttGridColumns';
import { ensureAssigneesEditorRegistered } from './GanttAssigneesEditor';

export type GanttEditorUserOption = {
  id: string;
  text: string;
};

/** Опции select в типах SVAR: `{ id, label }`. */
function toSelectOptions(users: GanttEditorUserOption[]) {
  return users.map(user => ({ id: user.id, label: user.text }));
}

const TASK_CLASS_OPTIONS = (
  Object.entries(TASK_CLASS_LABELS) as Array<[string, string]>
).map(([id, label]) => ({ id, label }));

/**
 * Поля Editor для рабочей задачи.
 *
 * Исполнители: кастомный `assignees` (Ant multi-select) — MIT SVAR
 * не регистрирует native `resources`, поэтому UI был пустым.
 *
 * Runtime: key `assigneeIds` → API `assignee_ids`.
 */
export function createGanttEditorItems(users: GanttEditorUserOption[]) {
  ensureAssigneesEditorRegistered();

  const withoutType = defaultEditorItems.filter(
    item => item.key !== 'type' && item.key !== 'resources',
  );

  const userOptions = toSelectOptions(users);

  const extras = [
    {
      key: 'taskClass',
      label: 'Класс',
      comp: 'select',
      options: TASK_CLASS_OPTIONS,
      isDisabled: (values: { isAutoAuxiliary?: boolean }) =>
        values.isAutoAuxiliary === true,
    },
    {
      key: 'responsibleUserId',
      label: 'Ответственный',
      comp: 'select',
      options: [{ id: '', label: '— не выбран —' }, ...userOptions],
    },
    {
      key: 'assigneeIds',
      label: 'Исполнители',
      comp: 'assignees',
      options: userOptions,
      isDisabled: (values: { isAutoAuxiliary?: boolean }) =>
        values.isAutoAuxiliary === true,
    },
    {
      key: 'hourlyRate',
      label: 'Ставка, ₽/ч',
      comp: 'text',
    },
  ];

  return [...withoutType, ...extras] as typeof defaultEditorItems;
}

export function formatUserLabel(user: {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email?: string;
}): string {
  const name = [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim();
  return name || user.email || '—';
}
