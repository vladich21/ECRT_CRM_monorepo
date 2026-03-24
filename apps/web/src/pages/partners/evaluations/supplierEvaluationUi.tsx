import type { ReactNode } from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';

import type { SupplierEvaluationScoreDetail } from '../../../types/supplierEvaluation';

import type {
  SupplierEvaluationCategory,
  SupplierEvaluationListItem,
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

export function getRowUiStatus(row: SupplierEvaluationListItem): UiEvalRowStatus {
  if (row.status === 'archived') return 'archived';
  if (row.category === 'D' && !row.next_reevaluation_date) return 'blocked';
  if (row.next_reevaluation_date) {
    const d = dayjs(row.next_reevaluation_date).endOf('day');
    const diff = d.diff(dayjs(), 'day', true);
    if (diff < 0) return 'overdue';
    if (diff <= 30) return 'soon';
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

export function formatReevaluationCell(row: SupplierEvaluationListItem, ui: UiEvalRowStatus): ReactNode {
  if (ui === 'blocked') return '—';
  if (ui === 'archived') return <span style={{ color: '#bfbfbf' }}>Заменена</span>;
  if (!row.next_reevaluation_date) return '—';
  const d = dayjs(row.next_reevaluation_date);
  const days = d.endOf('day').diff(dayjs(), 'day');
  const dateStr = d.format('DD.MM.YYYY');
  if (days < 0) return <span style={{ color: '#ff4d4f', fontWeight: 500 }}>{dateStr}</span>;
  if (days <= 30)
    return (
      <span style={{ color: '#faad14', fontWeight: 500 }}>
        {dateStr}{' '}
        <span style={{ fontSize: 11 }}>({days} дн.)</span>
      </span>
    );
  return <span style={{ color: '#8c8c8c' }}>{dateStr}</span>;
}
