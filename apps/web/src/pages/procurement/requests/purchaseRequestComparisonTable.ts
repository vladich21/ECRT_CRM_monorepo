import type { ComparisonQuote } from '@/api/procurement/requests/procurementRequest.types';
import { formatMoneyAmount } from '@/helpers/numberFormatters';

import { formatQuotePaymentTermLines } from './purchaseQuotePayment';
import { formatPurchaseRequestDate } from './purchaseRequestLabels';

export type ComparisonCriterionKey = 'price' | 'net' | 'deviation' | 'delivery' | 'warranty' | 'payment' | 'valid';

export type ComparisonTableRow = {
  key: ComparisonCriterionKey;
  criterion: string;
  /** Массив — значение рисуется в несколько строк (условия оплаты). */
  values: Record<string, string | string[]>;
};

export function marketPreviewMessage(code: string | undefined): string | null {
  if (code === 'too_few_quotes') return 'Для метода «рынок» нужно минимум 3 КП';
  if (code === 'too_few_after_filter') {
    return 'После исключения выбросов осталось меньше 3 КП. Выберите другой метод расчёта НМЦД.';
  }
  return null;
}

export function formatDeviationPercent(value: string | null): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  const sign = n > 0 ? '+' : '';
  return `${sign}${value.replace('.', ',')} %`;
}

export function buildComparisonTableRows(quotes: ComparisonQuote[], currency: string): ComparisonTableRow[] {
  const cell = (pick: (quote: ComparisonQuote) => string | string[]): Record<string, string | string[]> => {
    const values: Record<string, string | string[]> = {};
    for (const quote of quotes) values[quote.quote_id] = pick(quote);
    return values;
  };

  return [
    {
      key: 'price',
      criterion: 'Цена с НДС',
      values: cell(quote => formatMoneyAmount(quote.price, currency)),
    },
    {
      key: 'net',
      criterion: 'Цена без НДС',
      values: cell(quote => formatMoneyAmount(quote.net_price, currency)),
    },
    {
      key: 'deviation',
      criterion: 'Откл. от экспертной',
      values: cell(quote => formatDeviationPercent(quote.deviation_from_expert)),
    },
    {
      key: 'delivery',
      criterion: 'Срок поставки, дн.',
      values: cell(quote => (quote.delivery_days != null ? String(quote.delivery_days) : '—')),
    },
    {
      key: 'warranty',
      criterion: 'Гарантия, мес.',
      values: cell(quote => (quote.warranty_months != null ? String(quote.warranty_months) : '—')),
    },
    {
      key: 'payment',
      criterion: 'Оплата',
      values: cell(quote => formatQuotePaymentTermLines(quote.payment_terms)),
    },
    {
      key: 'valid',
      criterion: 'Действует до',
      values: cell(quote => formatPurchaseRequestDate(quote.valid_until)),
    },
  ];
}

export function comparisonCellKind(params: {
  criterion: ComparisonCriterionKey;
  quoteId: string;
  best: { price: string | null; delivery: string | null; warranty: string | null };
  outlierIds: Set<string>;
}): 'best' | 'outlier' | null {
  if (params.criterion === 'price' || params.criterion === 'net') {
    if (params.best.price === params.quoteId) return 'best';
  }
  if (params.criterion === 'delivery' && params.best.delivery === params.quoteId) return 'best';
  if (params.criterion === 'warranty' && params.best.warranty === params.quoteId) return 'best';
  if (params.outlierIds.has(params.quoteId)) return 'outlier';
  return null;
}
