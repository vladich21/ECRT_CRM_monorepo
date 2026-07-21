import type { IColumnConfig, ITask } from '@svar-ui/react-gantt';

function formatDateCell(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString('ru-RU');
  }
  if (typeof value === 'string' && value.trim()) return value;
  return '—';
}

function formatHoursCell(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  }
  return '—';
}

/** Ширина под дату DD.MM.YYYY по центру. */
const DATE_COL_WIDTH = 104;
/** Ширина под часы по центру. */
const HOURS_COL_WIDTH = 88;

/**
 * Колонки без сортировки и без «+»; добавление задач — только через ПКМ.
 */
export const GANTT_GRID_COLUMNS: IColumnConfig[] = [
  { id: 'text', header: 'Название', width: 300, align: 'left', resize: true, sort: false },
  {
    id: 'start',
    header: 'Начало',
    width: DATE_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatDateCell(value),
  },
  {
    id: 'end',
    header: 'Окончание',
    width: DATE_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatDateCell(value),
  },
  {
    id: 'deadline',
    header: 'Срок',
    width: DATE_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatDateCell(value),
  },
  {
    id: 'laborHours',
    header: 'Труд. ч',
    width: HOURS_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatHoursCell(value),
  },
  {
    id: 'actualHours',
    header: 'Факт',
    width: HOURS_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatHoursCell(value),
  },
];

export type GanttGridTaskFields = Pick<ITask, 'start' | 'end'> & {
  deadline?: Date | null;
  laborHours?: number | null;
  actualHours?: number | null;
};
