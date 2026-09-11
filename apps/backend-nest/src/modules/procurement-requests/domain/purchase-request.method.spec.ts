import assert from 'node:assert/strict';
import test from 'node:test';

import { priceToKopecks } from './purchase-quote.nmcd';
import {
  evaluatePurchaseMethods,
  isAmountInThreshold,
  purchaseMethodSelectError,
  type PurchaseMethodThresholdInput,
} from './purchase-request.method';

const SEEDED: PurchaseMethodThresholdInput[] = [
  {
    id: 'small',
    code: 'small',
    name: 'До 100 тыс. ₽',
    amount_from_kopecks: null,
    amount_to_kopecks: priceToKopecks(100_000),
    vat_base: 'net',
  },
  {
    id: 'medium',
    code: 'medium',
    name: 'Свыше 100 до 500 тыс. ₽',
    amount_from_kopecks: priceToKopecks(100_000),
    amount_to_kopecks: priceToKopecks(500_000),
    vat_base: 'net',
  },
  {
    id: 'commission',
    code: 'commission',
    name: 'Свыше 500 тыс. ₽ (комиссия)',
    amount_from_kopecks: priceToKopecks(500_000),
    amount_to_kopecks: null,
    vat_base: 'net',
  },
];

function byCode(amount: number) {
  const rows = evaluatePurchaseMethods(SEEDED, priceToKopecks(amount), priceToKopecks(amount));
  return Object.fromEntries(rows.map(row => [row.code, row]));
}

test('amount_from exclusive, amount_to inclusive', () => {
  assert.equal(isAmountInThreshold(priceToKopecks(100_000), null, priceToKopecks(100_000)), true);
  assert.equal(isAmountInThreshold(priceToKopecks(100_000), priceToKopecks(100_000), priceToKopecks(500_000)), false);
  assert.equal(isAmountInThreshold(priceToKopecks(100_000.01), priceToKopecks(100_000), priceToKopecks(500_000)), true);
});

test('100_000 net is still small (done-when S12)', () => {
  const rows = byCode(100_000);
  assert.equal(rows.small.in_threshold, true);
  assert.equal(rows.medium.in_threshold, false);
  assert.equal(rows.commission.in_threshold, false);
  assert.equal(rows.small.requires_justification, false);
  assert.equal(rows.medium.requires_justification, true);
  assert.equal(rows.medium.allowed, true);
});

test('above 500_000 only commission is allowed (BP-2)', () => {
  const rows = byCode(500_000.01);
  assert.equal(rows.commission.in_threshold, true);
  assert.equal(rows.small.allowed, false);
  assert.equal(rows.medium.allowed, false);
  assert.equal(purchaseMethodSelectError(rows.small, 'хочу малую'), 'forbidden');
  assert.equal(purchaseMethodSelectError(rows.commission, null), null);
});

test('out of threshold without text is need_justification', () => {
  const rows = byCode(75_136.61);
  assert.equal(rows.small.in_threshold, true);
  assert.equal(purchaseMethodSelectError(rows.medium, null), 'need_justification');
  assert.equal(purchaseMethodSelectError(rows.medium, 'особый случай'), null);
});
