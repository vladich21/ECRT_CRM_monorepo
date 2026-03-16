export type ProjectFilterTab = 'all' | 'active' | 'completed' | 'pending' | 'paused' | 'cancelled';

export type ProjectAdvancedFilters = {
  managerId: string | null;
};

export const DEFAULT_PROJECT_FILTERS: ProjectAdvancedFilters = {
  managerId: null,
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
