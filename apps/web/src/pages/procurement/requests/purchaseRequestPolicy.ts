/** Зеркало backend `canPatchDraft`. Остальные роли/статусы — в policy следующих слайсов, не в JSX. */
export function canEditPurchaseRequestDraft(
  request: { status: string; initiator_id: string },
  actorId: string | undefined,
): boolean {
  return request.status === 'draft' && Boolean(actorId) && request.initiator_id === actorId;
}

/** Зеркало backend `canSubmitPurchaseRequest`. */
export function canSubmitPurchaseRequest(
  request: { status: string; initiator_id: string },
  actorId: string | undefined,
): boolean {
  return request.status === 'draft' && Boolean(actorId) && request.initiator_id === actorId;
}

/** Зеркало backend `canChangeIncomeLink`. Ветку correction после расходного — ФС-2. */
export function canChangePurchaseRequestIncomeLink(
  request: { funding_source: string; initiator_id: string; lead_manager_id: string | null; status: string },
  actorId: string | undefined,
  extras?: { canApprove?: boolean },
): boolean {
  if (!actorId) return false;
  if (request.funding_source !== 'income_contract') return false;
  if (extras?.canApprove && request.status === 'pending_approval') return true;
  if (request.initiator_id === actorId) return true;
  return Boolean(request.lead_manager_id) && request.lead_manager_id === actorId;
}

/** ЗАП-20: утвердить нельзя, пока нет доходного договора. Пустой этап не блокирует. */
export function needsIncomeContractForApprove(request: {
  funding_source: string;
  income_contract_id: string | null;
}): boolean {
  return request.funding_source === 'income_contract' && !request.income_contract_id;
}

/** ЗАП-9: назначить ведущего — только проработка. Право procurement.lead проверяет CanAccess. */
export function canAssignPurchaseRequestLead(request: { status: string }): boolean {
  return request.status === 'in_elaboration';
}

/** ЗАП-9: поля проработки пишет назначенный ведущий. */
export function canEditPurchaseRequestElaboration(
  request: { status: string; lead_manager_id: string | null },
  actorId: string | undefined,
): boolean {
  return (
    request.status === 'in_elaboration' &&
    Boolean(actorId) &&
    Boolean(request.lead_manager_id) &&
    request.lead_manager_id === actorId
  );
}

/** S11: зеркало backend `canSendToAgreement`. */
export function canSendPurchaseRequestToAgreement(
  request: {
    status: string;
    lead_manager_id: string | null;
    price_method: string | null;
    selected_quote_id: string | null;
  },
  actorId: string | undefined,
): boolean {
  return (
    canEditPurchaseRequestElaboration(request, actorId) &&
    Boolean(request.price_method) &&
    Boolean(request.selected_quote_id)
  );
}

/** ВИ-6: способ закупки после agreed пишет назначенный ведущий. */
export function canSetPurchaseRequestMethod(
  request: { status: string; lead_manager_id: string | null },
  actorId: string | undefined,
): boolean {
  return (
    request.status === 'agreed' &&
    Boolean(actorId) &&
    Boolean(request.lead_manager_id) &&
    request.lead_manager_id === actorId
  );
}

/** ВИ-7: оформить можно после сохранённого способа. Кнопка — зеркало API. */
export function canChoosePurchaseRequestRoute(
  request: { status: string; lead_manager_id: string | null; purchase_method_id: string | null },
  actorId: string | undefined,
): boolean {
  return canSetPurchaseRequestMethod(request, actorId) && Boolean(request.purchase_method_id);
}

const PURCHASE_REQUEST_PATCH_FIELDS = [
  'subject',
  'justification',
  'required_date',
  'project_id',
  'department_id',
  'tech_acceptor_id',
  'funding_source',
  'income_contract_id',
  'income_stage_id',
  'expert_price',
  'amount',
  'currency_code',
  'vat_rate_id',
  'vat_included',
  'is_urgent',
] as const;

type PurchaseRequestPatchField = (typeof PURCHASE_REQUEST_PATCH_FIELDS)[number];

const ELABORATION_WRITABLE: readonly PurchaseRequestPatchField[] = [
  'justification',
  'required_date',
  'expert_price',
  'amount',
  'currency_code',
  'vat_rate_id',
  'vat_included',
  'is_urgent',
];

/** Зеркало backend `writableFields`. */
export function purchaseRequestWritableFields(
  request: { status: string; initiator_id: string; lead_manager_id: string | null },
  actorId: string | undefined,
): ReadonlySet<PurchaseRequestPatchField> {
  if (!actorId) return new Set();
  if (canEditPurchaseRequestDraft(request, actorId)) return new Set(PURCHASE_REQUEST_PATCH_FIELDS);
  if (canEditPurchaseRequestElaboration(request, actorId)) return new Set(ELABORATION_WRITABLE);
  return new Set();
}
