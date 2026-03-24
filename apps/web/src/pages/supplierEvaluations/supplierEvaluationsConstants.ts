import type { SupplierEvaluationCategory, SupplierEvaluationUiStatusParam } from '../../types/supplierEvaluation';

/** Фильтр по букве категории (A–D). */
export const EVALUATION_CATEGORY_FILTER_OPTIONS: { value: 'all' | SupplierEvaluationCategory; label: string }[] = [
  { value: 'all', label: 'Все категории' },
  { value: 'A', label: 'A (≥4.0)' },
  { value: 'B', label: 'B (3.0–3.9)' },
  { value: 'C', label: 'C (2.0–2.9)' },
  { value: 'D', label: 'D (<2.0)' },
];

/** Вкладки смысла строки (как в макете реестра). `all` — без ui_status на API. */
export const EVALUATION_UI_TABS: { key: SupplierEvaluationUiStatusParam; label: string }[] = [
  { key: 'all', label: 'Все статусы' },
  { key: 'current', label: 'Актуальные' },
  { key: 'archived', label: 'Архив' },
  { key: 'blocked', label: 'Заблокированные' },
  { key: 'overdue', label: 'Просрочена переоценка' },
  { key: 'reeval_soon', label: 'Скоро переоценка' },
];

const YEAR_START = new Date().getFullYear() - 5;
const YEAR_END = new Date().getFullYear() + 2;

/** Значение фильтра «все годы» в Select (Ant Design не допускает `null` в options). */
export const EVALUATION_YEAR_FILTER_ALL = 'all';

export const EVALUATION_YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: EVALUATION_YEAR_FILTER_ALL, label: 'Все периоды' },
  ...Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => {
    const calendarYear = YEAR_START + index;
    return { value: String(calendarYear), label: String(calendarYear) };
  }),
];

/** Год для query `evaluated_year` или `undefined`, если выбраны все периоды. */
export function evaluationYearFilterToApi(yearFilterValue: string): number | undefined {
  if (!yearFilterValue || yearFilterValue === EVALUATION_YEAR_FILTER_ALL) return undefined;
  const parsed = Number(yearFilterValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}
