import {
  SHARE_TOTAL_CENTS,
  type PurchaseQuotePaymentTerm,
  type QuoteDayKind,
  type QuotePaymentType,
} from '@/api/procurement/requests/procurementRequest.types';

export const QUOTE_PAYMENT_TYPE_LABELS: Record<QuotePaymentType, string> = {
  advance: 'Аванс',
  payment: 'Оплата',
};

export const QUOTE_DAY_KIND_LABELS: Record<QuoteDayKind, string> = {
  calendar: 'календарных',
  working: 'рабочих',
};

export function shareToCents(share: number): number {
  return Math.round(share * 100);
}

export function paymentTermsShareCents(shares: Array<number | string | null | undefined>): number {
  return shares.reduce<number>((sum, share) => {
    const n = typeof share === 'number' ? share : Number(share);
    if (!Number.isFinite(n)) return sum;
    return sum + shareToCents(n);
  }, 0);
}

export function paymentTermsShareComplete(shares: Array<number | string | null | undefined>): boolean {
  return paymentTermsShareCents(shares) === SHARE_TOTAL_CENTS;
}

/** Каждое условие отдельной строкой: аванс и постоплату в одну строку не слепляем. */
export function formatQuotePaymentTermLines(terms: PurchaseQuotePaymentTerm[]): string[] {
  return terms.map(term => {
    const share = `${term.share}%`;
    const typeLabel = QUOTE_PAYMENT_TYPE_LABELS[term.payment_type as QuotePaymentType] ?? term.payment_type;
    if (term.payment_type === 'advance') return `${share} ${typeLabel.toLowerCase()}`;
    const days = term.days != null ? String(term.days) : '';
    const kind = term.day_kind ? (QUOTE_DAY_KIND_LABELS[term.day_kind as QuoteDayKind] ?? term.day_kind) : '';
    const schedule = days && kind ? `, ${days} ${kind} дн.` : '';
    return `${share} ${typeLabel.toLowerCase()}${schedule}`;
  });
}

export function formatQuotePaymentTerms(terms: PurchaseQuotePaymentTerm[]): string {
  const lines = formatQuotePaymentTermLines(terms);
  return lines.length === 0 ? '—' : lines.join('; ');
}

export const EMPTY_QUOTE_PAYMENT_LINE = {
  share: 100,
  payment_type: 'payment' as QuotePaymentType,
  days: 30,
  day_kind: 'calendar' as QuoteDayKind,
};
