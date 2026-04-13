import type { Dayjs } from 'dayjs';

import { PROJECT_STATUS_SURFACES, type StatusBadgeSurface } from '../../../constants/statusBadgeSurfaces';

export type ProjectFilterTab = 'all' | 'active' | 'completed' | 'pending' | 'paused' | 'cancelled' | 'deleted';
export type ProjectEndDatePresenceFilter = 'any' | 'set' | 'empty';
export type ProjectAdvancedFilters = {
  managerId: string | null;
  purchaserId: string | null;
  overlapRange: [Dayjs, Dayjs] | null;
  startDateRange: [Dayjs, Dayjs] | null;
  endDateRange: [Dayjs, Dayjs] | null;
  endDatePresence: ProjectEndDatePresenceFilter;
};
export const DEFAULT_PROJECT_FILTERS: ProjectAdvancedFilters = {
  managerId: null,
  purchaserId: null,
  overlapRange: null,
  startDateRange: null,
  endDateRange: null,
  endDatePresence: 'any',
};
export const PROJECT_FILTER_TABS: {
  key: ProjectFilterTab;
  label: string;
}[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'pending', label: 'В ожидании' },
  { key: 'paused', label: 'Приостановленные' },
  { key: 'cancelled', label: 'Отменённые' },
  { key: 'deleted', label: 'Удалённые' },
];
export type ProjectStatusVisual = StatusBadgeSurface & { label: string };

export const PROJECT_STATUS_CONFIG: Record<string, ProjectStatusVisual> = {
  active: { label: 'Активный', ...PROJECT_STATUS_SURFACES.active },
  completed: { label: 'Завершён', ...PROJECT_STATUS_SURFACES.completed },
  pending: { label: 'В ожидании', ...PROJECT_STATUS_SURFACES.pending },
  paused: { label: 'Приостановлен', ...PROJECT_STATUS_SURFACES.paused },
  cancelled: { label: 'Отменён', ...PROJECT_STATUS_SURFACES.cancelled },
};
export const END_DATE_PRESENCE_OPTIONS: {
  label: string;
  value: ProjectEndDatePresenceFilter;
}[] = [
  { label: 'Любые', value: 'any' },
  { label: 'С датой окончания', value: 'set' },
  { label: 'Без даты (бессрочные)', value: 'empty' },
];
