import dayjs, { type Dayjs } from 'dayjs';

import type {
  SupplierEvaluationCategory,
  SupplierEvaluationSortDir,
  SupplierEvaluationSortField,
  SupplierEvaluationUiStatusParam,
} from '../../types/supplierEvaluation';

export type EvaluationRegistrySortPreset =
  | 'evaluated_at_desc'
  | 'evaluated_at_asc'
  | 'weighted_score_asc'
  | 'weighted_score_desc';

export const EVALUATION_REGISTRY_SORT_OPTIONS: { value: EvaluationRegistrySortPreset; label: string }[] = [
  { value: 'evaluated_at_desc', label: 'Сначала новые по дате' },
  { value: 'evaluated_at_asc', label: 'Сначала старые по дате' },
  { value: 'weighted_score_asc', label: 'Балл: слабые сверху' },
  { value: 'weighted_score_desc', label: 'Балл: сильные сверху' },
];

export function evaluationRegistrySortToRequestParams(preset: EvaluationRegistrySortPreset): {
  sort_field?: SupplierEvaluationSortField;
  sort_dir?: SupplierEvaluationSortDir;
} {
  switch (preset) {
    case 'evaluated_at_desc':
      return { sort_field: 'evaluated_at', sort_dir: 'desc' };
    case 'evaluated_at_asc':
      return { sort_field: 'evaluated_at', sort_dir: 'asc' };
    case 'weighted_score_asc':
      return { sort_field: 'weighted_score', sort_dir: 'asc' };
    case 'weighted_score_desc':
      return { sort_field: 'weighted_score', sort_dir: 'desc' };
  }
}

export const EVALUATION_CATEGORY_FILTER_OPTIONS: { value: 'all' | SupplierEvaluationCategory; label: string }[] = [
  { value: 'all', label: 'Все категории' },
  { value: 'A', label: 'A (≥4.0)' },
  { value: 'B', label: 'B (3.0–3.9)' },
  { value: 'C', label: 'C (2.0–2.9)' },
  { value: 'D', label: 'D (<2.0)' },
];

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

export const EVALUATION_YEAR_FILTER_ALL = 'all';

export const EVALUATION_YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: EVALUATION_YEAR_FILTER_ALL, label: 'Все периоды' },
  ...Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, index) => {
    const calendarYear = YEAR_START + index;
    return { value: String(calendarYear), label: String(calendarYear) };
  }),
];

export function evaluationYearFilterToApi(yearFilterValue: string): number | undefined {
  if (!yearFilterValue || yearFilterValue === EVALUATION_YEAR_FILTER_ALL) return undefined;
  const parsed = Number(yearFilterValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function supplierEvaluationEvaluatedAtRangePresets(): { label: string; value: [Dayjs, Dayjs] }[] {
  const cy = dayjs().year();
  const presets: { label: string; value: [Dayjs, Dayjs] }[] = [
    { label: 'Текущий год', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
  ];
  for (let back = 1; back <= 12; back += 1) {
    const y = cy - back;
    presets.push({
      label: String(y),
      value: [dayjs().year(y).startOf('year'), dayjs().year(y).endOf('year')],
    });
  }
  return presets;
}
