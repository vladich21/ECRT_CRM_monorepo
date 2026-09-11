import assert from 'node:assert/strict';
import test from 'node:test';

import { changedRequisiteFields } from './purchase-request.diff';

const existing = {
  subject: 'Кабель',
  justification: 'Для монтажа',
  requiredDate: '2026-09-20',
  projectId: 'p1',
  departmentId: 'd1',
  techAcceptorId: 'u1',
  fundingSource: 'budget',
  expertPrice: null,
  amount: '1250.50',
  currencyCode: 'RUB',
  vatRateId: null,
  vatIncluded: true,
  isUrgent: false,
  incomeContractId: null,
  incomeStageId: null,
};

test('full PATCH with the same values is not a change', () => {
  assert.deepEqual(
    changedRequisiteFields(existing, {
      subject: 'Кабель',
      justification: 'Для монтажа',
      required_date: '2026-09-20',
      project_id: 'p1',
      department_id: 'd1',
      tech_acceptor_id: 'u1',
      funding_source: 'budget',
      amount: 1250.5,
      is_urgent: false,
    }),
    [],
  );
});

test('only justification counts when the rest is the same', () => {
  assert.deepEqual(
    changedRequisiteFields(existing, {
      subject: 'Кабель',
      justification: 'Другое обоснование',
      required_date: '2026-09-20',
      project_id: 'p1',
      department_id: 'd1',
      tech_acceptor_id: 'u1',
      funding_source: 'budget',
      amount: 1250.5,
      is_urgent: false,
    }),
    ['justification'],
  );
});
