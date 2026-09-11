import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateMarketNmcd,
  deviationFromExpertPercent,
  isMarketOutlier,
  kopecksToAmount,
  netFromGrossKopecks,
  pickBestQuoteIds,
  priceToKopecks,
} from './purchase-quote.nmcd';

test('netFromGrossKopecks strips VAT', () => {
  assert.equal(netFromGrossKopecks(priceToKopecks(122), 22), priceToKopecks(100));
  assert.equal(netFromGrossKopecks(priceToKopecks(120), 20), priceToKopecks(100));
  assert.equal(netFromGrossKopecks(priceToKopecks(100), 0), priceToKopecks(100));
  assert.equal(netFromGrossKopecks(priceToKopecks(100), null), priceToKopecks(100));
});

test('isMarketOutlier is strict > 33%', () => {
  const avg = priceToKopecks(100);
  assert.equal(isMarketOutlier(priceToKopecks(133), avg), false);
  assert.equal(isMarketOutlier(priceToKopecks(133.01), avg), true);
  assert.equal(isMarketOutlier(priceToKopecks(67), avg), false);
  assert.equal(isMarketOutlier(priceToKopecks(66.99), avg), true);
});

test('calculateMarketNmcd rejects fewer than 3 quotes', () => {
  const result = calculateMarketNmcd([
    { quote_id: 'a', net_kopecks: priceToKopecks(100) },
    { quote_id: 'b', net_kopecks: priceToKopecks(110) },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'too_few_quotes');
});

test('calculateMarketNmcd 100/100/200 leaves < 3 after outlier', () => {
  const result = calculateMarketNmcd([
    { quote_id: 'a', net_kopecks: priceToKopecks(100) },
    { quote_id: 'b', net_kopecks: priceToKopecks(100) },
    { quote_id: 'c', net_kopecks: priceToKopecks(200) },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'too_few_after_filter');
    assert.deepEqual(result.excluded.map(row => row.quote_id), ['c']);
    assert.equal(result.included.length, 2);
  }
});

test('calculateMarketNmcd 100/100/100/200 excludes 200 and averages 100', () => {
  const result = calculateMarketNmcd([
    { quote_id: 'a', net_kopecks: priceToKopecks(100) },
    { quote_id: 'b', net_kopecks: priceToKopecks(100) },
    { quote_id: 'c', net_kopecks: priceToKopecks(100) },
    { quote_id: 'd', net_kopecks: priceToKopecks(200) },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(kopecksToAmount(result.average_after), '100.00');
    assert.deepEqual(result.excluded.map(row => row.quote_id), ['d']);
    assert.equal(result.included.length, 3);
  }
});

test('pickBestQuoteIds prefers min net, min delivery, max warranty', () => {
  const best = pickBestQuoteIds([
    { quote_id: 'a', net_kopecks: 20000, delivery_days: 10, warranty_months: 12 },
    { quote_id: 'b', net_kopecks: 10000, delivery_days: 20, warranty_months: 24 },
    { quote_id: 'c', net_kopecks: 15000, delivery_days: 5, warranty_months: 6 },
  ]);
  assert.deepEqual(best, { price: 'b', delivery: 'c', warranty: 'b' });
});

test('deviationFromExpertPercent', () => {
  assert.equal(deviationFromExpertPercent(priceToKopecks(110), priceToKopecks(100)), '10.0');
  assert.equal(deviationFromExpertPercent(priceToKopecks(90), priceToKopecks(100)), '-10.0');
  assert.equal(deviationFromExpertPercent(priceToKopecks(50), 0), null);
});
