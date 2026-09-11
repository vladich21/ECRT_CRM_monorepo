import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IllegalPurchaseRequestTransition,
  isDraft,
  nextStatus,
  statusOnCreate,
} from './purchase-request.transitions';

test('create starts as draft', () => {
  assert.equal(statusOnCreate(), 'draft');
  assert.equal(isDraft('draft'), true);
  assert.equal(isDraft('pending_approval'), false);
});

test('submit / approve / reject / return / cancel follow ВИ-4', () => {
  assert.equal(nextStatus('draft', 'submit'), 'pending_approval');
  assert.equal(nextStatus('pending_approval', 'approve'), 'in_elaboration');
  assert.equal(nextStatus('pending_approval', 'reject'), 'rejected');
  assert.equal(nextStatus('pending_approval', 'return'), 'draft');
  assert.equal(nextStatus('pending_approval', 'cancel'), 'draft');
  assert.equal(nextStatus('draft', 'cancel'), 'draft');
});

test('to_agreement / approve / return follow S11', () => {
  assert.equal(nextStatus('in_elaboration', 'to_agreement'), 'in_agreement');
  assert.equal(nextStatus('in_agreement', 'approve'), 'agreed');
  assert.equal(nextStatus('in_agreement', 'return'), 'in_elaboration');
  assert.equal(nextStatus('in_agreement', 'reject'), 'in_elaboration');
  assert.equal(nextStatus('in_agreement', 'cancel'), 'in_elaboration');
});

test('illegal transition throws', () => {
  assert.throws(() => nextStatus('draft', 'approve'), IllegalPurchaseRequestTransition);
  assert.throws(() => nextStatus('in_elaboration', 'submit'), IllegalPurchaseRequestTransition);
  assert.throws(() => nextStatus('rejected', 'submit'), IllegalPurchaseRequestTransition);
  assert.throws(() => nextStatus('agreed', 'to_agreement'), IllegalPurchaseRequestTransition);
});
