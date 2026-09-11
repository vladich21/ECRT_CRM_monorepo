import { isAgreed, isDraft, isInElaboration } from './purchase-request.transitions';

/** Ключи PATCH реквизитов. `updated_at` сюда не входит — это optimistic lock, не поле карточки. */
export const PURCHASE_REQUEST_PATCH_FIELDS = [
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

export type PurchaseRequestPatchField = (typeof PURCHASE_REQUEST_PATCH_FIELDS)[number];

/** Проработка: цены и уточнения, не смена проекта/источника (доходный — отдельная команда). */
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

/** Черновик пишет только инициатор-владелец. */
export function canPatchDraft(params: {
  status: string;
  initiatorId: string;
  actorId: string;
}): boolean {
  return isDraft(params.status) && params.initiatorId === params.actorId;
}

/** ВИ-4: на утверждение отправляет инициатор, и только из черновика. */
export function canSubmitPurchaseRequest(params: {
  status: string;
  initiatorId: string;
  actorId: string;
}): boolean {
  return isDraft(params.status) && params.initiatorId === params.actorId;
}

/**
 * ВИ-3: сменить пару договор+этап. До ФС-2 (заключённый расходный) —
 * инициатор, назначенный ведущий ОУП или текущий утверждающий (ВИ-4).
 * `procurement.correction` в SECTIONS уже есть, ветку по нему не включаем.
 */
export function canChangeIncomeLink(params: {
  initiatorId: string;
  leadManagerId: string | null;
  actorId: string;
  isCurrentApprover?: boolean;
}): boolean {
  if (params.isCurrentApprover) return true;
  if (params.actorId === params.initiatorId) return true;
  return Boolean(params.leadManagerId) && params.actorId === params.leadManagerId;
}

/** ЗАП-9: назначить ведущего можно только в проработке. Право — секция procurement.lead. */
export function canAssignLead(params: { status: string }): boolean {
  return isInElaboration(params.status);
}

/**
 * ЗАП-9: проработку пишет только назначенный ведущий.
 * Сотрудник ОУП с edit на запросах, но без lead_manager_id — 403.
 */
export function canPatchElaboration(params: {
  status: string;
  leadManagerId: string | null;
  actorId: string;
}): boolean {
  return (
    isInElaboration(params.status) &&
    Boolean(params.leadManagerId) &&
    params.leadManagerId === params.actorId
  );
}

/** НМЦД зафиксирована: метод выбран. `impossible` может быть без суммы. */
export function isNmcdFixed(params: { priceMethod: string | null }): boolean {
  return Boolean(params.priceMethod);
}

export function isSupplierSelected(params: { selectedQuoteId: string | null }): boolean {
  return Boolean(params.selectedQuoteId);
}

/**
 * S11: на согласование — назначенный ведущий, из проработки, после НМЦД и выбора поставщика.
 * Кнопка на фронте только зеркало; отказ без этого — 400/403 с API, не «скрыли и обошли».
 */
export function canSendToAgreement(params: {
  status: string;
  leadManagerId: string | null;
  actorId: string;
  priceMethod: string | null;
  selectedQuoteId: string | null;
}): boolean {
  return (
    canPatchElaboration(params) &&
    isNmcdFixed(params) &&
    isSupplierSelected(params)
  );
}

/** ВИ-6: способ закупки после agreed пишет назначенный ведущий. */
export function canSetPurchaseMethod(params: {
  status: string;
  leadManagerId: string | null;
  actorId: string;
}): boolean {
  return isAgreed(params.status) && Boolean(params.leadManagerId) && params.leadManagerId === params.actorId;
}

/** ВИ-7: путь оформления — после способа, тот же ведущий. Без method_id нельзя перепрыгнуть ВИ-6. */
export function canChooseRoute(params: {
  status: string;
  leadManagerId: string | null;
  actorId: string;
  purchaseMethodId: string | null;
}): boolean {
  return canSetPurchaseMethod(params) && Boolean(params.purchaseMethodId);
}

/**
 * Без-1 / БП-18: какие ключи PATCH можно писать в этом статусе этой ролью.
 * Пустой набор = писать нельзя (сервис отдаёт тот же 403, что и раньше).
 */
export function writableFields(params: {
  status: string;
  initiatorId: string;
  leadManagerId: string | null;
  actorId: string;
}): ReadonlySet<PurchaseRequestPatchField> {
  if (canPatchDraft({ status: params.status, initiatorId: params.initiatorId, actorId: params.actorId })) {
    return new Set(PURCHASE_REQUEST_PATCH_FIELDS);
  }
  if (
    canPatchElaboration({
      status: params.status,
      leadManagerId: params.leadManagerId,
      actorId: params.actorId,
    })
  ) {
    return new Set(ELABORATION_WRITABLE);
  }
  return new Set();
}

/** Ключи, которые клиент прислал, но шаг/роль не дают. */
export function forbiddenPatchFields(
  dto: Partial<Record<PurchaseRequestPatchField, unknown>>,
  allowed: ReadonlySet<PurchaseRequestPatchField>,
): PurchaseRequestPatchField[] {
  return PURCHASE_REQUEST_PATCH_FIELDS.filter(field => dto[field] !== undefined && !allowed.has(field));
}
