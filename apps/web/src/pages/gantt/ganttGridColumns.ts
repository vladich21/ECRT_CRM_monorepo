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

function formatBudgetCell(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  }
  return '—';
}

const TASK_CLASS_LABELS: Record<string, string> = {
  technical: 'Техническая',
  coexecutor: 'Соисполнитель',
  auxiliary: 'Вспомогательная',
};

function formatTaskClassCell(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  return TASK_CLASS_LABELS[value] ?? value;
}

/** Ширина под дату DD.MM.YYYY по центру. */
const DATE_COL_WIDTH = 104;
/** Ширина под часы по центру. */
const HOURS_COL_WIDTH = 96;
const BUDGET_COL_WIDTH = 110;
const CLASS_COL_WIDTH = 130;

/**
 * Колонки без сортировки и без «+»; добавление задач — только через ПКМ.
 * Бюджет — для Project/Contract/Stage (у task пусто).
 * У coexecutor План/Факт (ч.) с API приходят null → «—».
 */
export const GANTT_GRID_COLUMNS: IColumnConfig[] = [
  { id: 'text', header: 'Название', width: 280, align: 'left', resize: true, sort: false },
  {
    id: 'taskClass',
    header: 'Класс',
    width: CLASS_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatTaskClassCell(value),
  },
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
    id: 'budget',
    header: 'Бюджет, ₽',
    width: BUDGET_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatBudgetCell(value),
  },
  {
    id: 'planAmount',
    header: 'План, ₽',
    width: BUDGET_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatBudgetCell(value),
  },
  {
    id: 'factAmount',
    header: 'Факт, ₽',
    width: BUDGET_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatBudgetCell(value),
  },
  {
    id: 'laborHours',
    header: 'План (ч.)',
    width: HOURS_COL_WIDTH,
    align: 'center',
    resize: true,
    sort: false,
    template: (value: unknown) => formatHoursCell(value),
  },
  {
    id: 'actualHours',
    header: 'Факт (ч.)',
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
  budget?: number | null;
  planAmount?: number | null;
  factAmount?: number | null;
  hourlyRate?: number | null;
  taskClass?: string | null;
};

export { TASK_CLASS_LABELS };
