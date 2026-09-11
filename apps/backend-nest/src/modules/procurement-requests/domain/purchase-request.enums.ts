export const PURCHASE_REQUEST_STATUSES = [
  'draft',
  'pending_approval',
  'in_elaboration',
  'in_agreement',
  'agreed',
  'rejected',
] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export type PurchaseRequestTabCounts = Record<'all' | PurchaseRequestStatus, number>;

export function emptyPurchaseRequestTabCounts(): PurchaseRequestTabCounts {
  return {
    all: 0,
    draft: 0,
    pending_approval: 0,
    in_elaboration: 0,
    in_agreement: 0,
    agreed: 0,
    rejected: 0,
  };
}

export const FUNDING_SOURCES = ['income_contract', 'investment_program', 'budget'] as const;

export type FundingSource = (typeof FUNDING_SOURCES)[number];

/** numeric(15, 2): 13 цифр до запятой. Иначе Postgres 22003, не 400. */
export const MONEY_NUMERIC_MAX = 9_999_999_999_999.99;

export const REQUIRED_CREATE_FIELDS = [
  'subject',
  'justification',
  'required_date',
  'project_id',
  'tech_acceptor_id',
  'department_id',
  'funding_source',
] as const;
