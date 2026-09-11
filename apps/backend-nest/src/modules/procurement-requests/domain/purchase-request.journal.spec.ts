import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyIncomeLink, incomeLinksEqual } from './purchase-request.journal';

test('incomeLinksEqual compares ids only', () => {
  assert.equal(
    incomeLinksEqual(
      { income_contract_id: 'c', income_stage_id: 's' },
      { income_contract_id: 'c', income_stage_id: 's' },
    ),
    true,
  );
  assert.equal(
    incomeLinksEqual(
      { income_contract_id: 'c', income_stage_id: null },
      { income_contract_id: 'c', income_stage_id: 's' },
    ),
    false,
  );
});

test('emptyIncomeLink is a null pair', () => {
  assert.deepEqual(emptyIncomeLink(), {
    income_contract_id: null,
    income_stage_id: null,
    income_contract_name: null,
    income_stage_name: null,
  });
});
