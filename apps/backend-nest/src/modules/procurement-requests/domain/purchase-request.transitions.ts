import type { PurchaseRequestStatus } from './purchase-request.enums';

export const PURCHASE_REQUEST_ENTITY_TYPE = 'purchase_request';
export const PURCHASE_REQUEST_APPROVAL_ROUTE_CODE = 'purchase_request_vi4';

/** Второй процесс: ВИ-4 после approve лочит `purchase_request`, иначе второе согласование не стартует. */
export const PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE = 'purchase_request_agreement';
export const PURCHASE_REQUEST_AGREEMENT_ROUTE_CODE = 'purchase_request_agreement';

export const PURCHASE_REQUEST_APPROVAL_ENTITY_TYPES = [
  PURCHASE_REQUEST_ENTITY_TYPE,
  PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE,
] as const;

export type PurchaseRequestTransitionAction =
  | 'submit'
  | 'to_agreement'
  | 'approve'
  | 'reject'
  | 'return'
  | 'cancel';

const TRANSITIONS: Record<
  PurchaseRequestStatus,
  Partial<Record<PurchaseRequestTransitionAction, PurchaseRequestStatus>>
> = {
  draft: { submit: 'pending_approval', cancel: 'draft' },
  pending_approval: {
    approve: 'in_elaboration',
    reject: 'rejected',
    return: 'draft',
    cancel: 'draft',
  },
  in_elaboration: { to_agreement: 'in_agreement' },
  in_agreement: {
    approve: 'agreed',
    reject: 'in_elaboration',
    return: 'in_elaboration',
    cancel: 'in_elaboration',
  },
  agreed: {},
  rejected: {},
};

export function nextStatus(
  from: string,
  action: PurchaseRequestTransitionAction,
): PurchaseRequestStatus {
  const next = TRANSITIONS[from as PurchaseRequestStatus]?.[action];
  if (!next) {
    throw new IllegalPurchaseRequestTransition(from, action);
  }
  return next;
}

export class IllegalPurchaseRequestTransition extends Error {
  readonly from: string;
  readonly action: PurchaseRequestTransitionAction;

  constructor(from: string, action: PurchaseRequestTransitionAction) {
    super(`Нельзя выполнить «${action}» в статусе «${from}»`);
    this.name = 'IllegalPurchaseRequestTransition';
    this.from = from;
    this.action = action;
  }
}

export function statusOnCreate(): PurchaseRequestStatus {
  return 'draft';
}

export function isDraft(status: string): boolean {
  return status === 'draft';
}

export function isInElaboration(status: string): boolean {
  return status === 'in_elaboration';
}

export function isInAgreement(status: string): boolean {
  return status === 'in_agreement';
}

export function isAgreed(status: string): boolean {
  return status === 'agreed';
}
