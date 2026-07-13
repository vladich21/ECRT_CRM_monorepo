import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isStepOrderIncluded,
  resolveIncludedStepOrders,
  validateIncludedStepOrders,
} from './approval-step-inclusion';

const steps = [
  { stepOrder: 1, isRequired: true },
  { stepOrder: 2, isRequired: false },
  { stepOrder: 3, isRequired: false },
  { stepOrder: 4, isRequired: true },
];

test('includes all steps when route has no optional steps', () => {
  const requiredOnly = [
    { stepOrder: 1, isRequired: true },
    { stepOrder: 2, isRequired: true },
  ];
  assert.deepEqual(resolveIncludedStepOrders(requiredOnly), [1, 2]);
});

test('includes all steps by default when optional exist', () => {
  assert.deepEqual(resolveIncludedStepOrders(steps), [1, 2, 3, 4]);
});

test('keeps required steps even if omitted from request', () => {
  assert.deepEqual(resolveIncludedStepOrders(steps, [2]), [1, 2, 4]);
});

test('allows excluding optional steps', () => {
  assert.deepEqual(resolveIncludedStepOrders(steps, [1, 4]), [1, 4]);
});

test('rejects unknown step order', () => {
  assert.equal(validateIncludedStepOrders(steps, [99]), 'Неизвестный шаг маршрута: 99');
});

test('rejects empty effective route', () => {
  const onlyOptional = [
    { stepOrder: 1, isRequired: false },
    { stepOrder: 2, isRequired: false },
  ];
  assert.equal(
    validateIncludedStepOrders(onlyOptional, []),
    'Должен быть включён хотя бы один шаг согласования',
  );
});

test('checks membership helper', () => {
  assert.equal(isStepOrderIncluded(2, [1, 2, 4]), true);
  assert.equal(isStepOrderIncluded(3, [1, 2, 4]), false);
});

console.log('Approval step inclusion tests passed.');
