import assert from 'node:assert/strict';
import test from 'node:test';

import { isQuoteExpiring, remainingWorkingDays } from './purchase-quote.workdays';

test('remainingWorkingDays counts Mon–Fri inclusive', () => {
  assert.equal(remainingWorkingDays('2026-09-07', '2026-09-11'), 5);
  assert.equal(remainingWorkingDays('2026-09-07', '2026-09-10'), 4);
  assert.equal(remainingWorkingDays('2026-09-11', '2026-09-14'), 2);
  assert.equal(remainingWorkingDays('2026-09-12', '2026-09-13'), 0);
  assert.equal(remainingWorkingDays('2026-09-14', '2026-09-10'), 0);
});

test('isQuoteExpiring when fewer than 5 working days left or already expired', () => {
  assert.equal(isQuoteExpiring('2026-09-11', '2026-09-07'), false);
  assert.equal(isQuoteExpiring('2026-09-10', '2026-09-07'), true);
  assert.equal(isQuoteExpiring('2026-09-01', '2026-09-10'), true);
  assert.equal(isQuoteExpiring(null, '2026-09-10'), false);
});
