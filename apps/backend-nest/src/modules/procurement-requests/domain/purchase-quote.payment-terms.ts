import {
  MAX_PAYMENT_TERM_LINES,
  QUOTE_DAY_KINDS,
  QUOTE_PAYMENT_TYPES,
  SHARE_TOTAL_CENTS,
  type QuoteDayKind,
  type QuotePaymentType,
} from './purchase-quote.enums';

export type PaymentTermLine = {
  share: number;
  payment_type: string;
  days: number | null;
  day_kind: string | null;
  base_event: string | null;
};

export type PaymentTermsError =
  | { kind: 'empty' }
  | { kind: 'too_many' }
  | { kind: 'share_sum'; actualCents: number }
  | { kind: 'advance_has_schedule'; lineNo: number }
  | { kind: 'payment_missing_schedule'; lineNo: number }
  | { kind: 'unknown_type'; lineNo: number }
  | { kind: 'unknown_day_kind'; lineNo: number };

const PAYMENT_TYPE_SET = new Set<string>(QUOTE_PAYMENT_TYPES);
const DAY_KIND_SET = new Set<string>(QUOTE_DAY_KINDS);

export function shareToCents(share: number): number {
  return Math.round(share * 100);
}

export function isQuotePaymentType(value: string): value is QuotePaymentType {
  return PAYMENT_TYPE_SET.has(value);
}

export function isQuoteDayKind(value: string): value is QuoteDayKind {
  return DAY_KIND_SET.has(value);
}

function hasSchedule(line: PaymentTermLine): boolean {
  return line.days != null || Boolean(line.day_kind);
}

/**
 * БП-16 / БП-31: доли в копейках = 100%; аванс без days/day_kind;
 * оплата — оба поля обязательны.
 */
export function validatePaymentTerms(lines: PaymentTermLine[]): PaymentTermsError | null {
  if (lines.length === 0) return { kind: 'empty' };
  if (lines.length > MAX_PAYMENT_TERM_LINES) return { kind: 'too_many' };

  let cents = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const lineNo = i;
    if (!isQuotePaymentType(line.payment_type)) {
      return { kind: 'unknown_type', lineNo };
    }
    if (line.payment_type === 'advance' && hasSchedule(line)) {
      return { kind: 'advance_has_schedule', lineNo };
    }
    if (line.payment_type === 'payment') {
      if (line.days == null || line.days < 1 || !line.day_kind) {
        return { kind: 'payment_missing_schedule', lineNo };
      }
      if (!isQuoteDayKind(line.day_kind)) {
        return { kind: 'unknown_day_kind', lineNo };
      }
    }
    cents += shareToCents(line.share);
  }
  if (cents !== SHARE_TOTAL_CENTS) {
    return { kind: 'share_sum', actualCents: cents };
  }
  return null;
}
