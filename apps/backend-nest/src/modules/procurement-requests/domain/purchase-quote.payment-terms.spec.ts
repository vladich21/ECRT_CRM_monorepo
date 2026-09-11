import assert from 'node:assert/strict';
import test from 'node:test';

import { SHARE_TOTAL_CENTS } from './purchase-quote.enums';
import { shareToCents, validatePaymentTerms, type PaymentTermLine } from './purchase-quote.payment-terms';

function line(partial: Partial<PaymentTermLine> & Pick<PaymentTermLine, 'share' | 'payment_type'>): PaymentTermLine {
  return {
    days: null,
    day_kind: null,
    base_event: null,
    ...partial,
  };
}

test('shareToCents rounds half-up like money', () => {
  assert.equal(shareToCents(33.33), 3333);
  assert.equal(shareToCents(33.335), 3334);
  assert.equal(shareToCents(100), SHARE_TOTAL_CENTS);
});

test('validatePaymentTerms accepts 100% split with advance + payment', () => {
  assert.equal(
    validatePaymentTerms([
      line({ share: 30, payment_type: 'advance' }),
      line({ share: 70, payment_type: 'payment', days: 15, day_kind: 'working' }),
    ]),
    null,
  );
});

test('validatePaymentTerms rejects 99%', () => {
  const error = validatePaymentTerms([
    line({ share: 99, payment_type: 'payment', days: 10, day_kind: 'calendar' }),
  ]);
  assert.deepEqual(error, { kind: 'share_sum', actualCents: 9900 });
});

test('БП-16: аванс не принимает days/day_kind', () => {
  assert.deepEqual(
    validatePaymentTerms([line({ share: 100, payment_type: 'advance', days: 5 })]),
    { kind: 'advance_has_schedule', lineNo: 0 },
  );
  assert.deepEqual(
    validatePaymentTerms([line({ share: 100, payment_type: 'advance', day_kind: 'calendar' })]),
    { kind: 'advance_has_schedule', lineNo: 0 },
  );
});

test('payment requires days and day_kind', () => {
  assert.deepEqual(
    validatePaymentTerms([line({ share: 100, payment_type: 'payment', days: 10 })]),
    { kind: 'payment_missing_schedule', lineNo: 0 },
  );
  assert.deepEqual(
    validatePaymentTerms([line({ share: 100, payment_type: 'payment', day_kind: 'calendar' })]),
    { kind: 'payment_missing_schedule', lineNo: 0 },
  );
});

test('empty and unknown type', () => {
  assert.deepEqual(validatePaymentTerms([]), { kind: 'empty' });
  assert.deepEqual(
    validatePaymentTerms([line({ share: 100, payment_type: 'postpay' })]),
    { kind: 'unknown_type', lineNo: 0 },
  );
});
