import { describe, expect, it } from 'vitest';

import {
  canAssignPurchaseRequestLead,
  canChangePurchaseRequestIncomeLink,
  canEditPurchaseRequestDraft,
  canEditPurchaseRequestElaboration,
  canSendPurchaseRequestToAgreement,
  canSetPurchaseRequestMethod,
  canChoosePurchaseRequestRoute,
  canSubmitPurchaseRequest,
  needsIncomeContractForApprove,
} from './purchaseRequestPolicy';

const draft = {
  status: 'draft',
  initiator_id: 'a',
  lead_manager_id: null as string | null,
  funding_source: 'income_contract',
  income_contract_id: null as string | null,
};

describe('purchaseRequestPolicy', () => {
  it('submit and edit only for initiator on draft', () => {
    expect(canSubmitPurchaseRequest(draft, 'a')).toBe(true);
    expect(canEditPurchaseRequestDraft(draft, 'a')).toBe(true);
    expect(canSubmitPurchaseRequest(draft, 'b')).toBe(false);
    expect(canSubmitPurchaseRequest({ ...draft, status: 'pending_approval' }, 'a')).toBe(false);
  });

  it('income link: initiator, lead or current approver', () => {
    expect(canChangePurchaseRequestIncomeLink(draft, 'a')).toBe(true);
    expect(canChangePurchaseRequestIncomeLink({ ...draft, lead_manager_id: 'lead' }, 'lead')).toBe(true);
    expect(canChangePurchaseRequestIncomeLink(draft, 'pm')).toBe(false);
    expect(
      canChangePurchaseRequestIncomeLink({ ...draft, status: 'pending_approval' }, 'pm', { canApprove: true }),
    ).toBe(true);
    expect(canChangePurchaseRequestIncomeLink({ ...draft, funding_source: 'budget' }, 'a')).toBe(false);
  });

  it('approve needs income contract only for that funding source', () => {
    expect(needsIncomeContractForApprove(draft)).toBe(true);
    expect(needsIncomeContractForApprove({ ...draft, income_contract_id: 'c1' })).toBe(false);
    expect(needsIncomeContractForApprove({ ...draft, funding_source: 'budget' })).toBe(false);
  });

  it('assign lead only in elaboration', () => {
    expect(canAssignPurchaseRequestLead({ status: 'in_elaboration' })).toBe(true);
    expect(canAssignPurchaseRequestLead({ status: 'draft' })).toBe(false);
  });

  it('elaboration edit only for the assigned lead', () => {
    expect(canEditPurchaseRequestElaboration({ status: 'in_elaboration', lead_manager_id: null }, 'oup')).toBe(false);
    expect(canEditPurchaseRequestElaboration({ status: 'in_elaboration', lead_manager_id: 'lead' }, 'oup')).toBe(false);
    expect(canEditPurchaseRequestElaboration({ status: 'in_elaboration', lead_manager_id: 'lead' }, 'lead')).toBe(true);
  });

  it('send to agreement only for assigned lead after NMCD and supplier', () => {
    const ready = {
      status: 'in_elaboration',
      lead_manager_id: 'lead',
      price_method: 'market',
      selected_quote_id: 'q1',
    };
    expect(canSendPurchaseRequestToAgreement(ready, 'lead')).toBe(true);
    expect(canSendPurchaseRequestToAgreement(ready, 'other')).toBe(false);
    expect(canSendPurchaseRequestToAgreement({ ...ready, price_method: null }, 'lead')).toBe(false);
    expect(canSendPurchaseRequestToAgreement({ ...ready, selected_quote_id: null }, 'lead')).toBe(false);
  });

  it('set method only for assigned lead on agreed', () => {
    expect(canSetPurchaseRequestMethod({ status: 'agreed', lead_manager_id: 'lead' }, 'lead')).toBe(true);
    expect(canSetPurchaseRequestMethod({ status: 'agreed', lead_manager_id: 'lead' }, 'other')).toBe(false);
    expect(canSetPurchaseRequestMethod({ status: 'in_elaboration', lead_manager_id: 'lead' }, 'lead')).toBe(false);
  });

  it('choose route only after method is saved', () => {
    const ready = { status: 'agreed', lead_manager_id: 'lead', purchase_method_id: 'm1' };
    expect(canChoosePurchaseRequestRoute(ready, 'lead')).toBe(true);
    expect(canChoosePurchaseRequestRoute({ ...ready, purchase_method_id: null }, 'lead')).toBe(false);
    expect(canChoosePurchaseRequestRoute(ready, 'other')).toBe(false);
  });
});
