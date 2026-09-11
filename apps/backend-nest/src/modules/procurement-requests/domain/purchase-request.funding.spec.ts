import assert from 'node:assert/strict';
import test from 'node:test';

import { needsIncomeContractForApprove, resolveFundingLink } from './purchase-request.funding';

test('resolveFundingLink clears ids unless source is income_contract', () => {
  assert.deepEqual(resolveFundingLink('budget', 'c1', 's1'), {
    incomeContractId: null,
    incomeStageId: null,
  });
  assert.deepEqual(resolveFundingLink('investment_program', 'c1', null), {
    incomeContractId: null,
    incomeStageId: null,
  });
});

test('resolveFundingLink keeps contract and optional stage', () => {
  assert.deepEqual(resolveFundingLink('income_contract', 'c1', 's1'), {
    incomeContractId: 'c1',
    incomeStageId: 's1',
  });
  assert.deepEqual(resolveFundingLink('income_contract', 'c1', null), {
    incomeContractId: 'c1',
    incomeStageId: null,
  });
});

test('needsIncomeContractForApprove only when income source has no contract', () => {
  assert.equal(needsIncomeContractForApprove('income_contract', null), true);
  assert.equal(needsIncomeContractForApprove('income_contract', ''), true);
  assert.equal(needsIncomeContractForApprove('income_contract', 'c1'), false);
  assert.equal(needsIncomeContractForApprove('budget', null), false);
});

test('resolveFundingLink drops stage without contract', () => {
  assert.deepEqual(resolveFundingLink('income_contract', null, 's1'), {
    incomeContractId: null,
    incomeStageId: null,
  });
  assert.deepEqual(resolveFundingLink('income_contract', '  ', 's1'), {
    incomeContractId: null,
    incomeStageId: null,
  });
});
