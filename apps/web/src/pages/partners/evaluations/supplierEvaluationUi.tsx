import type { ReactNode } from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';

import type {
  SupplierEvaluationCategory,
  SupplierEvaluationListItem,
  SupplierEvaluationScoreDetail,
} from '../../../types/supplierEvaluation';

/** Шаги балла как в макете supplier_eval_v3.html */
export const SCORE_STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

/** Синхронно с backend supplier-evaluation.rules.ts и UI фильтра по категориям */
export function categoryFromWeightedScore(weighted: number): SupplierEvaluationCategory {
  if (weighted < 2) return 'D';
  if (weighted < 3) return 'C';
  if (weighted < 4) return 'B';
  return 'A';
}

export function computeWeightedPreview(
  criteria: { id: string; weight: number }[],
  scores: Record<string, number>,
): number {
  const raw = criteria.reduce((acc, c) => acc + (scores[c.id] ?? 0) * c.weight, 0);
  return Math.round(raw * 100) / 100;
}

export type UiEvalRowStatus = 'blocked' | 'archived' | 'overdue' | 'soon' | 'active';

/** Синхронно с backend supplier-evaluation.rules REEVALUATION_SOON_WINDOW_DAYS */
export const REEVALUATION_SOON_WINDOW_DAYS = 20;

/** Календарные дни до даты (отрицательное — просрочка). */
export function calendarDaysUntil(isoDate: string): number {
  return dayjs(isoDate).startOf('day').diff(dayjs().startOf('day'), 'day');
}

/** До плановой переоценки от 0 до REEVALUATION_SOON_WINDOW_DAYS дней включительно (подсветка KPI, таблица, вкладка). */
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

export function CategoryTag({ category }: { category: SupplierEvaluationCategory }) {
  const color =
    category === 'A' ? 'success' : category === 'B' ? 'processing' : category === 'C' ? 'warning' : 'error';
  return (
    <Tag color={color} style={{ margin: 0, minWidth: 28, textAlign: 'center', fontWeight: 700 }}>
      {category}
    </Tag>
  );
}

/** Визуал балла 1–5 как в макете (сегменты + половина). */
export function ScoreDots({ value }: { value: number }) {
  const filled = Math.floor(value);
  const half = value % 1 > 0;
  const cells = [];
  for (let i = 1; i <= 5; i += 1) {
    let bg = '#f0f0f0';
    if (i <= filled) bg = '#1677ff';
    else if (i === filled + 1 && half) bg = '#adc6ff';
    cells.push(
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 2,
          background: bg,
        }}
      />,
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', marginRight: 6 }}>{cells}</span>
  );
}

/** Вес в процентах для таблицы (доля из API). */
export function weightPercent(weight: number): string {
  return `${(weight * 100).toFixed(0)}%`;
}

export function lineWeightedScore(row: SupplierEvaluationScoreDetail): number {
  if (row.weighted_line != null && !Number.isNaN(row.weighted_line)) return row.weighted_line;
  const w = row.criterion_weight ?? 0;
  return Math.round(row.score * w * 1000) / 1000;
}

export function scoreColor(weighted: number): string {
  if (weighted >= 4) return '#52c41a';
  if (weighted >= 3) return '#1677ff';
  if (weighted >= 2) return '#faad14';
  return '#ff4d4f';
}

export function statusBadgeLabel(status: UiEvalRowStatus): { text: string; color: string } {
  switch (status) {
    case 'blocked':
      return { text: 'Заблокирован', color: 'error' };
    case 'archived':
      return { text: 'Архив', color: 'default' };
    case 'overdue':
      return { text: 'Просрочена', color: 'error' };
    case 'soon':
      return { text: 'Скоро переоценка', color: 'warning' };
    default:
      return { text: 'Актуальна', color: 'success' };
  }
}

function daysRemainingSuffix(days: number): string {
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

/**
 * Колонка «Переоценка»: дата; если до срока ≤ REEVALUATION_SOON_WINDOW_DAYS календарных дней — жёлтая подсветка и скобки.
 */
export function formatNextReevaluationInline(nextIso: string | null): ReactNode {
  if (!nextIso) return '—';
  const { dateStr, days, overdue, soon } = nextReevaluationDisplay(nextIso);
  if (overdue) {
    return (
      <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
        {dateStr}{' '}
        <span style={{ fontSize: 12, fontWeight: 500 }}>({Math.abs(days)} дн. проср.)</span>
      </span>
    );
  }
  if (soon) {
    return (
      <span style={{ color: '#d48806', fontWeight: 500 }}>
        {dateStr}{' '}
        <span style={{ fontSize: 12, fontWeight: 500 }}>({daysRemainingSuffix(days)})</span>
      </span>
    );
  }
  return <span style={{ color: '#8c8c8c' }}>{dateStr}</span>;
}

/** Плитка KPI «Следующая оценка» — те же пороги и скобки, что в таблице. */
export function formatNextReevaluationKpiValue(nextIso: string | null): ReactNode {
  if (!nextIso) return '—';
  const { dateStr, days, overdue, soon } = nextReevaluationDisplay(nextIso);
  if (overdue) {
    return (
      <span style={{ color: '#ff4d4f' }}>
        {dateStr}{' '}
        <span style={{ fontSize: 16, fontWeight: 700 }}>({Math.abs(days)} дн. проср.)</span>
      </span>
    );
  }
  if (soon) {
    return (
      <span style={{ color: '#d48806' }}>
        {dateStr}{' '}
        <span style={{ fontSize: 16, fontWeight: 700 }}>({daysRemainingSuffix(days)})</span>
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
      <span style={{ color: '#8c8c8c' }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>Заменена</span>
        <span style={{ fontSize: 11, display: 'block', marginTop: 2 }}>оценка от {evalRu}</span>
      </span>
    );
  }
  if (!row.next_reevaluation_date) return '—';
  return formatNextReevaluationInline(row.next_reevaluation_date);
}
