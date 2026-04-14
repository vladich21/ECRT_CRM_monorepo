import type { ReactNode } from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';

import type { StatusBadgeSurface } from '../../../constants/statusBadgeSurfaces';
import { getSupplierEvalRowSurface, mutedTagStyle } from '../../../constants/statusBadgeSurfaces';
import type {
  SupplierEvaluationCategory,
  SupplierEvaluationListItem,
  SupplierEvaluationScoreDetail,
} from '../../../types/supplierEvaluation';

import uiStyles from './supplierEvaluationUi.module.scss';

export const SCORE_STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export const SUPPLIER_EVAL_WEIGHTED_MAX_D_EXCLUSIVE = 2;
export const SUPPLIER_EVAL_WEIGHTED_MAX_C_EXCLUSIVE = 3;
export const SUPPLIER_EVAL_WEIGHTED_MAX_B_EXCLUSIVE = 4;

export const SUPPLIER_EVAL_CATEGORY_COLOR: Record<SupplierEvaluationCategory, string> = {
  D: '#8b0000',
  C: '#ffbf00',
  B: '#52c41a',
  A: '#008000',
};

const SCORE_DOT_COLORS = ['#8b0000', '#cc5500', '#ffbf00', '#88cc00', '#008000'] as const;

export function scoreStepColor(step: number): string {
  const colorIndex = Math.min(4, Math.max(0, Math.round(step) - 1));
  return SCORE_DOT_COLORS[colorIndex];
}

export function categoryFromWeightedScore(weighted: number): SupplierEvaluationCategory {
  if (weighted < SUPPLIER_EVAL_WEIGHTED_MAX_D_EXCLUSIVE) return 'D';
  if (weighted < SUPPLIER_EVAL_WEIGHTED_MAX_C_EXCLUSIVE) return 'C';
  if (weighted < SUPPLIER_EVAL_WEIGHTED_MAX_B_EXCLUSIVE) return 'B';
  return 'A';
}

export function computeWeightedPreview(
  criteria: { id: string; weight: number }[],
  scores: Record<string, number>,
): number {
  const raw = criteria.reduce(
    (acc, criterion) => acc + (scores[criterion.id] ?? 0) * criterion.weight,
    0,
  );
  return Math.round(raw * 100) / 100;
}

export type UiEvalRowStatus = 'blocked' | 'archived' | 'overdue' | 'soon' | 'active';

export const REEVALUATION_SOON_WINDOW_DAYS = 20;

export function calendarDaysUntil(isoDate: string): number {
  return dayjs(isoDate).startOf('day').diff(dayjs().startOf('day'), 'day');
}

export function isNextReevaluationInSoonWindow(nextIso: string | null | undefined): boolean {
  if (!nextIso) return false;
  const days = calendarDaysUntil(nextIso);
  return days >= 0 && days <= REEVALUATION_SOON_WINDOW_DAYS;
}

export function formatEvaluatedAtRu(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return isoDate;
}

export function getRowUiStatus(row: SupplierEvaluationListItem): UiEvalRowStatus {
  if (row.status === 'archived') return 'archived';
  if (row.category === 'D' && !row.next_reevaluation_date) return 'blocked';
  if (row.next_reevaluation_date) {
    const days = calendarDaysUntil(row.next_reevaluation_date);
    if (days < 0) return 'overdue';
    if (days <= REEVALUATION_SOON_WINDOW_DAYS) return 'soon';
  }
  return 'active';
}

export function ScoreDots({ value }: { value: number }) {
  const filled = Math.floor(value);
  const half = value % 1 > 0;
  const color = scoreColor(value);
  const cells = [];
  for (let segmentIndex = 1; segmentIndex <= 5; segmentIndex += 1) {
    const isFilled = segmentIndex <= filled;
    const isHalf = segmentIndex === filled + 1 && half;
    cells.push(
      <span
        key={segmentIndex}
        className={uiStyles.dot}
        style={
          isFilled || isHalf
            ? { backgroundColor: color, opacity: isHalf ? 0.5 : 1 }
            : undefined
        }
      />,
    );
  }
  return <span className={uiStyles.dotsRow}>{cells}</span>;
}

export function weightPercent(weight: number): string {
  return `${(weight * 100).toFixed(0)}%`;
}

export function weightedLineFromScoreAndWeight(score: number, weight: number): number {
  return Math.round(score * weight * 1000) / 1000;
}

export function lineWeightedScore(row: SupplierEvaluationScoreDetail): number {
  if (row.weighted_line != null && !Number.isNaN(row.weighted_line)) return row.weighted_line;
  return weightedLineFromScoreAndWeight(row.score, row.criterion_weight ?? 0);
}

export function scoreColor(weighted: number): string {
  const clampedWeighted = Math.min(5, Math.max(1, weighted));
  return SUPPLIER_EVAL_CATEGORY_COLOR[categoryFromWeightedScore(clampedWeighted)];
}

export function CategoryTag({
  category,
  weightedScore,
}: {
  category: SupplierEvaluationCategory;
  weightedScore?: number | null;
}) {
  const accent =
    weightedScore != null && Number.isFinite(Number(weightedScore))
      ? scoreColor(Number(weightedScore))
      : SUPPLIER_EVAL_CATEGORY_COLOR[category];

  return (
    <Tag
      bordered={false}
      className={uiStyles.categoryTag}
      style={{
        borderColor: accent,
        color: accent,
        backgroundColor: `color-mix(in srgb, ${accent} 14%, white)`,
      }}
    >
      {category}
    </Tag>
  );
}

export function statusBadgeLabel(status: UiEvalRowStatus): { text: string; surface: StatusBadgeSurface } {
  const surface = getSupplierEvalRowSurface(status);
  switch (status) {
    case 'blocked':
      return { text: 'Заблокирован', surface };
    case 'archived':
      return { text: 'Архив', surface };
    case 'overdue':
      return { text: 'Просрочена', surface };
    case 'soon':
      return { text: 'Скоро переоценка', surface };
    default:
      return { text: 'Актуальна', surface };
  }
}

export function daysRemainingSuffix(days: number): string {
  if (days === 0) return 'сегодня';
  return `осталось ${days} дн.`;
}

function nextReevaluationDisplay(nextIso: string) {
  const days = calendarDaysUntil(nextIso);
  const dateStr = dayjs(nextIso).format('DD.MM.YYYY');
  return {
    dateStr,
    days,
    overdue: days < 0,
    soon: days >= 0 && days <= REEVALUATION_SOON_WINDOW_DAYS,
  };
}

export function formatNextReevaluationInline(nextIso: string | null): ReactNode {
  if (!nextIso) return '—';
  const { dateStr, days, overdue, soon } = nextReevaluationDisplay(nextIso);
  if (overdue) {
    return (
      <span className={`${uiStyles.nextMain} ${uiStyles.nextOverdue}`}>
        {dateStr}{' '}
        <span className={uiStyles.nextSub}>({Math.abs(days)} дн. проср.)</span>
      </span>
    );
  }
  if (soon) {
    return (
      <span className={`${uiStyles.nextMain} ${uiStyles.nextSoon}`}>
        {dateStr}{' '}
        <span className={uiStyles.nextSub}>({daysRemainingSuffix(days)})</span>
      </span>
    );
  }
  return <span className={uiStyles.nextMuted}>{dateStr}</span>;
}

export function formatNextReevaluationKpiValue(nextIso: string | null): ReactNode {
  if (!nextIso) return '—';
  const { dateStr, days, overdue, soon } = nextReevaluationDisplay(nextIso);
  if (overdue) {
    return (
      <span className={uiStyles.kpiOverdue}>
        {dateStr}{' '}
        <span className={uiStyles.kpiSub}>({Math.abs(days)} дн. проср.)</span>
      </span>
    );
  }
  if (soon) {
    return (
      <span className={uiStyles.kpiSoon}>
        {dateStr}{' '}
        <span className={uiStyles.kpiSub}>({daysRemainingSuffix(days)})</span>
      </span>
    );
  }
  return dateStr;
}

export function formatReevaluationCell(row: SupplierEvaluationListItem, ui: UiEvalRowStatus): ReactNode {
  if (ui === 'blocked') return '—';
  if (ui === 'archived') {
    const evalRu = formatEvaluatedAtRu(row.evaluated_at);
    return (
      <span className={uiStyles.archived}>
        <span className={uiStyles.archivedLabel}>Заменена</span>
        <span className={uiStyles.archivedMeta}>оценка от {evalRu}</span>
      </span>
    );
  }
  if (!row.next_reevaluation_date) return '—';
  return formatNextReevaluationInline(row.next_reevaluation_date);
}
