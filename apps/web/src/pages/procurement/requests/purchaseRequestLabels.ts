import {
  PRICE_METHODS,
  type IncomeLinkSnapshot,
  type LeadSnapshot,
  type PriceMethod,
  type PriceSnapshot,
  type PurchaseMethodSnapshot,
  type PurchaseRequestJournalAction,
  type PurchaseRequestJournalSnapshot,
  type QuoteSnapshot,
  type RouteDocumentSnapshot,
  type SelectionSnapshot,
  type SupplierSnapshot,
} from '@/api/procurement/requests/procurementRequest.types';
import type { FundingSource, PurchaseRequestStatus } from '@/api/procurement/requests/procurementRequestApi';
import type { DetailHeaderStatusBadgeVariant } from '@/components/pageLayout/detailHeaderStatusBadge';
import { formatMoneyAmount } from '@/helpers/numberFormatters';

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  draft: 'Черновик',
  pending_approval: 'На утверждении',
  in_elaboration: 'Проработка',
  in_agreement: 'На согласовании',
  agreed: 'Согласован',
  rejected: 'Отклонен',
};

export const PURCHASE_REQUEST_LIST_TABS = [
  { key: 'all', label: 'Все' },
  { key: 'draft', label: 'Черновики' },
  { key: 'pending_approval', label: 'На утверждении' },
  { key: 'in_elaboration', label: 'Проработка' },
  { key: 'in_agreement', label: 'На согласовании' },
  { key: 'agreed', label: 'Согласованы' },
  { key: 'rejected', label: 'Отклоненные' },
] as const;

export type PurchaseRequestListTab = (typeof PURCHASE_REQUEST_LIST_TABS)[number]['key'];

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
  income_contract: 'Доходный договор',
  investment_program: 'Инвестпрограмма',
  budget: 'Бюджет',
};

export function purchaseRequestStatusLabel(status: string): string {
  return PURCHASE_REQUEST_STATUS_LABELS[status as PurchaseRequestStatus] ?? status;
}

export function purchaseRequestStatusTagColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'default';
    case 'pending_approval':
    case 'in_elaboration':
    case 'in_agreement':
      return 'processing';
    case 'agreed':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
}

export function purchaseRequestHeaderBadgeVariant(status: string): DetailHeaderStatusBadgeVariant {
  switch (status) {
    case 'draft':
      return 'ridDraft';
    case 'pending_approval':
    case 'in_elaboration':
    case 'in_agreement':
      return 'info';
    case 'agreed':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function formatPurchaseRequestDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

export function formatPurchaseRequestAmount(amount: string | null, currency: string): string {
  return formatMoneyAmount(amount, currency);
}

export const PURCHASE_REQUEST_JOURNAL_ACTION_LABELS: Record<PurchaseRequestJournalAction, string> = {
  created: 'Создан запрос',
  updated: 'Изменены реквизиты',
  income_link_changed: 'Смена доходного договора',
  lead_assigned: 'Назначен ведущий ОУП',
  supplier_added: 'Добавлен поставщик',
  quote_added: 'Добавлено КП',
  quote_updated: 'Изменено КП',
  price_fixed: 'Зафиксирована НМЦД',
  supplier_selected: 'Выбран поставщик',
  agreement_started: 'Отправлен на согласование',
  method_selected: 'Выбран способ закупки',
  route_started: 'Оформлен договор',
};

export const PURCHASE_REQUEST_PATCH_FIELD_LABELS: Record<string, string> = {
  subject: 'Предмет',
  justification: 'Обоснование',
  required_date: 'Срок поставки',
  project_id: 'Проект',
  department_id: 'Подразделение',
  tech_acceptor_id: 'Технический приемщик',
  funding_source: 'Источник финансирования',
  expert_price: 'Экспертная цена',
  amount: 'Сумма',
  currency_code: 'Валюта',
  vat_rate_id: 'НДС',
  vat_included: 'НДС включен',
  is_urgent: 'Срочность',
};

export function purchaseRequestJournalActionLabel(action: string): string {
  return PURCHASE_REQUEST_JOURNAL_ACTION_LABELS[action as PurchaseRequestJournalAction] ?? action;
}

type JournalSnapshot = PurchaseRequestJournalSnapshot | undefined;

function isIncomeLink(snapshot: JournalSnapshot): snapshot is IncomeLinkSnapshot {
  return Boolean(snapshot && 'income_contract_id' in snapshot);
}

function isLead(snapshot: JournalSnapshot): snapshot is LeadSnapshot {
  return Boolean(snapshot && 'lead_manager_id' in snapshot);
}

function isQuote(snapshot: JournalSnapshot): snapshot is QuoteSnapshot {
  return Boolean(snapshot && 'quote_id' in snapshot && 'price' in snapshot);
}

function isSupplier(snapshot: JournalSnapshot): snapshot is SupplierSnapshot {
  return Boolean(snapshot && 'partner_id' in snapshot && !('quote_id' in snapshot));
}

function isPrice(snapshot: JournalSnapshot): snapshot is PriceSnapshot {
  return Boolean(snapshot && 'method' in snapshot);
}

function isSelection(snapshot: JournalSnapshot): snapshot is SelectionSnapshot {
  return Boolean(snapshot && 'reason_codes' in snapshot);
}

function isPurchaseMethod(snapshot: JournalSnapshot): snapshot is PurchaseMethodSnapshot {
  return Boolean(snapshot && 'method_id' in snapshot && 'method_code' in snapshot);
}

function isRouteDocument(snapshot: JournalSnapshot): snapshot is RouteDocumentSnapshot {
  return Boolean(snapshot && 'contract_id' in snapshot && 'kind' in snapshot);
}

export function formatIncomeLinkSnapshot(snapshot: JournalSnapshot): string {
  if (!isIncomeLink(snapshot) || !snapshot.income_contract_id) return 'Не указан';
  const title = snapshot.income_contract_name?.trim() || 'Договор';
  const stage = snapshot.income_stage_name?.trim();
  return stage ? `${title} · ${stage}` : title;
}

export function formatLeadSnapshot(snapshot: JournalSnapshot): string {
  if (!isLead(snapshot) || !snapshot.lead_manager_id) return 'Не назначен';
  return snapshot.lead_manager_name?.trim() || 'Сотрудник';
}

export function formatSupplierSnapshot(snapshot: JournalSnapshot): string {
  if (!isSupplier(snapshot)) return '—';
  return snapshot.partner_name?.trim() || 'Поставщик';
}

export function formatQuoteSnapshot(snapshot: JournalSnapshot): string {
  if (!isQuote(snapshot)) return '—';
  const name = snapshot.partner_name?.trim() || 'Поставщик';
  return snapshot.price ? `${name} · ${snapshot.price}` : name;
}

export const PRICE_METHOD_LABELS: Record<PriceMethod, string> = {
  market: 'Рыночный',
  normative: 'Нормативный',
  tariff: 'Тарифный',
  estimate: 'Сметный',
  cost: 'Затратный',
  impossible: 'Определить невозможно',
};

export function priceMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PRICE_METHOD_LABELS[method as PriceMethod] ?? method;
}

export function formatPriceSnapshot(snapshot: JournalSnapshot): string {
  if (!isPrice(snapshot)) return '—';
  const method = priceMethodLabel(snapshot.method);
  const amount = snapshot.amount ? ` · ${snapshot.amount}` : '';
  const excluded = snapshot.excluded_count ? ` · выбросов: ${snapshot.excluded_count}` : '';
  return `${method}${amount}${excluded}`;
}

export function formatSelectionSnapshot(snapshot: JournalSnapshot): string {
  if (!isSelection(snapshot)) return '—';
  return snapshot.partner_name?.trim() || 'Поставщик';
}

export function formatPurchaseMethodSnapshot(snapshot: JournalSnapshot): string {
  if (!isPurchaseMethod(snapshot)) return '—';
  const name = snapshot.method_name?.trim() || snapshot.method_code;
  return snapshot.in_threshold ? name : `${name} · вне порога`;
}

export function formatRouteDocumentSnapshot(snapshot: JournalSnapshot): string {
  if (!isRouteDocument(snapshot)) return '—';
  return snapshot.contract_name?.trim() || 'Договор';
}

export const PRICE_METHOD_OPTIONS = PRICE_METHODS.map(value => ({
  value,
  label: PRICE_METHOD_LABELS[value],
}));

export function formatPurchaseRequestDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}
