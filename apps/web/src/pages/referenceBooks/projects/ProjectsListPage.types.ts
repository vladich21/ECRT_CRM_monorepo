import type { Dayjs } from 'dayjs';

export type ProjectFilterTab = 'all' | 'active' | 'completed' | 'pending' | 'paused' | 'cancelled';

/** «Любые» | только с end_date | без end_date (бессрочные) */
export type ProjectEndDatePresenceFilter = 'any' | 'set' | 'empty';

export type ProjectAdvancedFilters = {
  managerId: string | null;
  createdById: string | null;
  /** Пересечение сроков проекта с интервалом (как у договоров) */
  overlapRange: [Dayjs, Dayjs] | null;
  /** Диапазон даты начала */
  startDateRange: [Dayjs, Dayjs] | null;
  /** Диапазон даты окончания (только проекты с заданной датой) */
  endDateRange: [Dayjs, Dayjs] | null;
  endDatePresence: ProjectEndDatePresenceFilter;
};

export const DEFAULT_PROJECT_FILTERS: ProjectAdvancedFilters = {
  managerId: null,
  createdById: null,
  overlapRange: null,
  startDateRange: null,
  endDateRange: null,
  endDatePresence: 'any',
};

export const PROJECT_FILTER_TABS: { key: ProjectFilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'pending', label: 'В ожидании' },
  { key: 'paused', label: 'Приостановленные' },
  { key: 'cancelled', label: 'Отменённые' },
];

export const PROJECT_STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  active:    { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', label: 'Активный' },
  completed: { color: '#1677ff', bg: '#e6f4ff', border: '#91caff', label: 'Завершён' },
  pending:   { color: '#faad14', bg: '#fffbe6', border: '#ffe58f', label: 'В ожидании' },
  paused:    { color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9', label: 'Приостановлен' },
  cancelled: { color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7', label: 'Отменён' },
};

export const END_DATE_PRESENCE_OPTIONS: { label: string; value: ProjectEndDatePresenceFilter }[] = [
  { label: 'Любые', value: 'any' },
  { label: 'С датой окончания', value: 'set' },
  { label: 'Без даты (бессрочные)', value: 'empty' },
];
