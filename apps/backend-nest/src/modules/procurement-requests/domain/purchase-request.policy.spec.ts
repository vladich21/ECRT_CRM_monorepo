import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAssignLead,
  canChangeIncomeLink,
  canChooseRoute,
  canPatchDraft,
  canPatchElaboration,
  canSendToAgreement,
  canSetPurchaseMethod,
  canSubmitPurchaseRequest,
  forbiddenPatchFields,
  writableFields,
} from './purchase-request.policy';

test('canPatchDraft only for the initiator on draft', () => {
  assert.equal(canPatchDraft({ status: 'draft', initiatorId: 'a', actorId: 'a' }), true);
  assert.equal(canPatchDraft({ status: 'draft', initiatorId: 'a', actorId: 'b' }), false);
  assert.equal(canPatchDraft({ status: 'in_elaboration', initiatorId: 'a', actorId: 'a' }), false);
});

test('canSubmitPurchaseRequest only for the initiator on draft', () => {
  assert.equal(canSubmitPurchaseRequest({ status: 'draft', initiatorId: 'a', actorId: 'a' }), true);
  assert.equal(canSubmitPurchaseRequest({ status: 'draft', initiatorId: 'a', actorId: 'b' }), false);
  assert.equal(canSubmitPurchaseRequest({ status: 'pending_approval', initiatorId: 'a', actorId: 'a' }), false);
});

test('canChangeIncomeLink is initiator, assigned lead or current approver', () => {
  assert.equal(canChangeIncomeLink({ initiatorId: 'a', leadManagerId: null, actorId: 'a' }), true);
  assert.equal(canChangeIncomeLink({ initiatorId: 'a', leadManagerId: 'lead', actorId: 'lead' }), true);
  assert.equal(canChangeIncomeLink({ initiatorId: 'a', leadManagerId: 'lead', actorId: 'other' }), false);
  assert.equal(canChangeIncomeLink({ initiatorId: 'a', leadManagerId: null, actorId: 'other' }), false);
  assert.equal(
    canChangeIncomeLink({ initiatorId: 'a', leadManagerId: null, actorId: 'pm', isCurrentApprover: true }),
    true,
  );
});

test('canAssignLead only in elaboration', () => {
  assert.equal(canAssignLead({ status: 'in_elaboration' }), true);
  assert.equal(canAssignLead({ status: 'draft' }), false);
  assert.equal(canAssignLead({ status: 'pending_approval' }), false);
});

test('canPatchElaboration only for the assigned lead', () => {
  assert.equal(
    canPatchElaboration({ status: 'in_elaboration', leadManagerId: null, actorId: 'oup' }),
    false,
  );
  assert.equal(
    canPatchElaboration({ status: 'in_elaboration', leadManagerId: 'lead', actorId: 'oup' }),
    false,
  );
  assert.equal(
    canPatchElaboration({ status: 'in_elaboration', leadManagerId: 'lead', actorId: 'lead' }),
    true,
  );
  assert.equal(
    canPatchElaboration({ status: 'draft', leadManagerId: 'lead', actorId: 'lead' }),
    false,
  );
});

test('canSendToAgreement needs assigned lead, NMCD and selected supplier', () => {
  const ready = {
    status: 'in_elaboration',
    leadManagerId: 'lead',
    actorId: 'lead',
    priceMethod: 'market',
    selectedQuoteId: 'q1',
  };
  assert.equal(canSendToAgreement(ready), true);
  assert.equal(canSendToAgreement({ ...ready, actorId: 'other' }), false);
  assert.equal(canSendToAgreement({ ...ready, priceMethod: null }), false);
  assert.equal(canSendToAgreement({ ...ready, selectedQuoteId: null }), false);
  assert.equal(canSendToAgreement({ ...ready, status: 'in_agreement' }), false);
});

test('canSetPurchaseMethod only for assigned lead on agreed', () => {
  assert.equal(
    canSetPurchaseMethod({ status: 'agreed', leadManagerId: 'lead', actorId: 'lead' }),
    true,
  );
  assert.equal(
    canSetPurchaseMethod({ status: 'agreed', leadManagerId: 'lead', actorId: 'other' }),
    false,
  );
  assert.equal(
    canSetPurchaseMethod({ status: 'in_elaboration', leadManagerId: 'lead', actorId: 'lead' }),
    false,
  );
});

test('canChooseRoute needs saved method on agreed lead', () => {
  const ready = {
    status: 'agreed',
    leadManagerId: 'lead',
    actorId: 'lead',
    purchaseMethodId: 'm1',
  };
  assert.equal(canChooseRoute(ready), true);
  assert.equal(canChooseRoute({ ...ready, purchaseMethodId: null }), false);
  assert.equal(canChooseRoute({ ...ready, actorId: 'other' }), false);
});

test('writableFields: draft initiator gets requisites, lead in elaboration does not', () => {
  const draft = writableFields({
    status: 'draft',
    initiatorId: 'a',
    leadManagerId: null,
    actorId: 'a',
  });
  assert.equal(draft.has('subject'), true);
  assert.equal(draft.has('project_id'), true);

  const lead = writableFields({
    status: 'in_elaboration',
    initiatorId: 'a',
    leadManagerId: 'lead',
    actorId: 'lead',
  });
  assert.equal(lead.has('amount'), true);
  assert.equal(lead.has('is_urgent'), true);
  assert.equal(lead.has('subject'), false);
  assert.equal(lead.has('project_id'), false);
  assert.equal(lead.has('income_contract_id'), false);

  const stranger = writableFields({
    status: 'draft',
    initiatorId: 'a',
    leadManagerId: null,
    actorId: 'other',
  });
  assert.equal(stranger.size, 0);
});

test('forbiddenPatchFields lists keys outside the allowed set', () => {
  const allowed = writableFields({
    status: 'in_elaboration',
    initiatorId: 'a',
    leadManagerId: 'lead',
    actorId: 'lead',
  });
  assert.deepEqual(forbiddenPatchFields({ subject: 'x', amount: 1 }, allowed), ['subject']);
  assert.deepEqual(forbiddenPatchFields({ amount: 1, is_urgent: true }, allowed), []);
});
