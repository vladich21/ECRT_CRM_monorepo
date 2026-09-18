import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequest.types';

import type { PurchaseRequestDraftFormValues } from './PurchaseRequestDraftFields';
import { toCreatePayload, toUpdatePayload } from './purchaseRequestFormUtils';

const base: PurchaseRequestDraftFormValues = {
  subject: 'Кабель',
  justification: 'Для монтажа',
  required_date: dayjs('2026-09-20'),
  project_id: 'p1',
  department_id: 'd1',
  tech_acceptor_id: 'u1',
  funding_source: 'budget',
  is_urgent: false,
  income_contract_id: 'c1',
  income_stage_id: 's1',
};

const detail: PurchaseRequestDetail = {
  id: 'r1',
  number: 1,
  request_date: '2026-09-10',
  status: 'draft',
  subject: 'Кабель',
  project_id: 'p1',
  project_name: 'П1',
  amount: '1250.50',
  currency_code: 'RUB',
  is_urgent: false,
  initiator_id: 'u0',
  initiator_name: 'Иванов',
  lead_manager_id: null,
  lead_manager_name: null,
  updated_at: '2026-09-10T09:00:00.000Z',
  justification: 'Для монтажа',
  required_date: '2026-09-20',
  department_id: 'd1',
  department_name: 'ОУП',
  tech_acceptor_id: 'u1',
  tech_acceptor_name: 'Петров',
  funding_source: 'budget',
  income_contract_id: null,
  income_contract_name: null,
  income_stage_id: null,
  income_stage_name: null,
  expert_price: null,
  vat_rate_id: null,
  vat_included: true,
  price_method: null,
  price_method_note: null,
  initial_max_price: null,
  nmcd_snapshot: null,
  selected_quote_id: null,
  selection_note: null,
  purchase_method_id: null,
  purchase_method_code: null,
  purchase_method_name: null,
  method_justification: null,
  routed_contract_id: null,
  suggested_lead_manager_id: null,
};

describe('toCreatePayload funding link', () => {
  it('drops leftover contract ids when source is not income_contract', () => {
    expect(toCreatePayload(base)).toMatchObject({
      funding_source: 'budget',
      income_contract_id: null,
      income_stage_id: null,
    });
  });

  it('keeps contract and optional stage for income_contract', () => {
    expect(toCreatePayload({ ...base, funding_source: 'income_contract' })).toMatchObject({
      income_contract_id: 'c1',
      income_stage_id: 's1',
    });
  });

  it('clears stage when contract is empty', () => {
    expect(
      toCreatePayload({ ...base, funding_source: 'income_contract', income_contract_id: null, income_stage_id: 's1' }),
    ).toMatchObject({
      income_contract_id: null,
      income_stage_id: null,
    });
  });
});

describe('toCreatePayload amount', () => {
  it('omits empty or zero amount from create', () => {
    expect(toCreatePayload({ ...base, amount: 0 }).amount).toBeUndefined();
    expect(toCreatePayload({ ...base, amount: null }).amount).toBeUndefined();
  });

  it('keeps a typed amount', () => {
    expect(toCreatePayload({ ...base, amount: 1250.5 }).amount).toBe(1250.5);
  });
});

describe('toUpdatePayload', () => {
  it('sends only the field that actually changed', () => {
    expect(toUpdatePayload({ ...base, amount: 1250.5, justification: 'Другое обоснование' }, detail)).toEqual({
      updated_at: detail.updated_at,
      justification: 'Другое обоснование',
    });
  });

  it('drops fields the step cannot write', () => {
    expect(
      toUpdatePayload({ ...base, amount: 2000, subject: 'Другой предмет' }, detail, new Set(['amount'])),
    ).toEqual({
      updated_at: detail.updated_at,
      amount: 2000,
    });
  });
});
