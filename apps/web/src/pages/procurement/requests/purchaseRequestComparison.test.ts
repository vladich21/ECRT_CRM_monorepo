import { describe, expect, it } from 'vitest';

import type { ComparisonQuote } from '@/api/procurement/requests/procurementRequest.types';

import {
  buildComparisonTableRows,
  comparisonCellKind,
  formatDeviationPercent,
  marketPreviewMessage,
} from './purchaseRequestComparisonTable';

const quote = (id: string, extra: Partial<ComparisonQuote> = {}): ComparisonQuote => ({
  quote_id: id,
  partner_id: `p-${id}`,
  partner_name: `Поставщик ${id}`,
  price: '120.00',
  net_price: '100.00',
  vat_percent: '20',
  delivery_days: 10,
  warranty_months: 12,
  payment_terms: [],
  valid_until: '2026-10-01',
  excluded_from_nmcd: false,
  deviation_from_expert: '10.0',
  working_days_left: 12,
  is_expiring: false,
  ...extra,
});

describe('purchaseRequestComparison', () => {
  it('formats deviation with sign', () => {
    expect(formatDeviationPercent('10.0')).toBe('+10,0 %');
    expect(formatDeviationPercent('-3.5')).toBe('-3,5 %');
    expect(formatDeviationPercent(null)).toBe('—');
  });

  it('explains market preview failures', () => {
    expect(marketPreviewMessage('too_few_quotes')).toMatch(/минимум 3/);
    expect(marketPreviewMessage('too_few_after_filter')).toMatch(/другой метод/);
    expect(marketPreviewMessage(undefined)).toBeNull();
  });

  it('builds criterion × supplier rows', () => {
    const rows = buildComparisonTableRows([quote('a'), quote('b', { price: '90.00' })], 'RUB');
    expect(rows.map(row => row.key)).toEqual([
      'price',
      'net',
      'deviation',
      'delivery',
      'warranty',
      'payment',
      'valid',
    ]);
    expect(rows[0]?.values.a).toContain('RUB');
    expect(rows[0]?.values.b).toBeDefined();
  });

  it('marks best price/delivery/warranty and outliers', () => {
    const best = { price: 'a', delivery: 'b', warranty: 'a' };
    const outliers = new Set(['c']);
    expect(comparisonCellKind({ criterion: 'net', quoteId: 'a', best, outlierIds: outliers })).toBe('best');
    expect(comparisonCellKind({ criterion: 'delivery', quoteId: 'b', best, outlierIds: outliers })).toBe('best');
    expect(comparisonCellKind({ criterion: 'warranty', quoteId: 'a', best, outlierIds: outliers })).toBe('best');
    expect(comparisonCellKind({ criterion: 'price', quoteId: 'c', best, outlierIds: outliers })).toBe('outlier');
    expect(comparisonCellKind({ criterion: 'payment', quoteId: 'a', best, outlierIds: outliers })).toBeNull();
  });
});
