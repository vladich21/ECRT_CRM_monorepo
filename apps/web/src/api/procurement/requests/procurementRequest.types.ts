export const PURCHASE_REQUEST_STATUSES = [
  'draft',
  'pending_approval',
  'in_elaboration',
  'in_agreement',
  'agreed',
  'rejected',
] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export const PURCHASE_REQUEST_ENTITY_TYPE = 'purchase_request';
export const PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE = 'purchase_request_agreement';

export const FUNDING_SOURCES = ['income_contract', 'investment_program', 'budget'] as const;

export type FundingSource = (typeof FUNDING_SOURCES)[number];

/** Как в БД numeric(15, 2). */
export const MONEY_NUMERIC_MAX = 9_999_999_999_999.99;

export type NmcdSnapshotQuote = {
  quote_id: string;
  partner_name: string | null;
  gross: string;
  net: string;
  vat_percent: string | null;
  deviation?: string;
};

export type NmcdSnapshot = {
  method: string;
  amount: string | null;
  note: string | null;
  average_before: string | null;
  average_after: string | null;
  included: NmcdSnapshotQuote[];
  excluded: NmcdSnapshotQuote[];
};

export type PurchaseRequestListRow = {
  id: string;
  number: number;
  request_date: string;
  status: string;
  subject: string;
  project_id: string;
  project_name: string | null;
  amount: string | null;
  currency_code: string;
  is_urgent: boolean;
  initiator_id: string;
  initiator_name: string | null;
  lead_manager_id: string | null;
  lead_manager_name: string | null;
  updated_at: string;
};

export type PurchaseRequestDetail = PurchaseRequestListRow & {
  justification: string;
  required_date: string;
  department_id: string;
  department_name: string | null;
  tech_acceptor_id: string;
  tech_acceptor_name: string | null;
  funding_source: string;
  income_contract_id: string | null;
  income_contract_name: string | null;
  income_stage_id: string | null;
  income_stage_name: string | null;
  expert_price: string | null;
  vat_rate_id: string | null;
  vat_included: boolean;
  price_method: string | null;
  price_method_note: string | null;
  initial_max_price: string | null;
  nmcd_snapshot: NmcdSnapshot | null;
  selected_quote_id: string | null;
  selection_note: string | null;
  purchase_method_id: string | null;
  purchase_method_code: string | null;
  purchase_method_name: string | null;
  method_justification: string | null;
  routed_contract_id: string | null;
};

export type PurchaseRequestsListParams = {
  status?: PurchaseRequestStatus;
  projectId?: string;
  initiatorId?: string;
  search?: string;
  limit: number;
  offset: number;
};

export type PurchaseRequestTabCounts = Record<'all' | PurchaseRequestStatus, number>;

export const EMPTY_PURCHASE_REQUEST_TAB_COUNTS: PurchaseRequestTabCounts = {
  all: 0,
  draft: 0,
  pending_approval: 0,
  in_elaboration: 0,
  in_agreement: 0,
  agreed: 0,
  rejected: 0,
};

export type PurchaseRequestsListResponse = {
  data: PurchaseRequestListRow[];
  total: number;
  tab_counts: PurchaseRequestTabCounts;
};

export type CreatePurchaseRequestPayload = {
  subject: string;
  justification: string;
  required_date: string;
  project_id: string;
  department_id: string;
  tech_acceptor_id: string;
  funding_source: FundingSource;
  is_urgent?: boolean;
  amount?: number;
  income_contract_id?: string | null;
  income_stage_id?: string | null;
};

export type UpdatePurchaseRequestPayload = {
  updated_at: string;
  subject?: string;
  justification?: string;
  required_date?: string;
  project_id?: string;
  department_id?: string;
  tech_acceptor_id?: string;
  funding_source?: FundingSource;
  is_urgent?: boolean;
  amount?: number | null;
  income_contract_id?: string | null;
  income_stage_id?: string | null;
};

export type IncomeLinkSnapshot = {
  income_contract_id: string | null;
  income_stage_id: string | null;
  income_contract_name: string | null;
  income_stage_name: string | null;
};

export type LeadSnapshot = {
  lead_manager_id: string | null;
  lead_manager_name: string | null;
};

export type SupplierSnapshot = {
  partner_id: string;
  partner_name: string | null;
};

export type QuoteSnapshot = {
  quote_id: string;
  partner_id: string;
  partner_name: string | null;
  price: string;
};

export type PriceSnapshot = {
  method: string;
  amount: string | null;
  excluded_count: number;
};

export type SelectionSnapshot = {
  quote_id: string;
  partner_id: string;
  partner_name: string | null;
  reason_codes: string[];
};

export type PurchaseMethodSnapshot = {
  method_id: string;
  method_code: string;
  method_name: string | null;
  in_threshold: boolean;
};

export type RouteDocumentSnapshot = {
  kind: string;
  contract_id: string;
  contract_name: string | null;
};

export type PurchaseRequestJournalPayload = {
  fields?: string[];
  from?: PurchaseRequestJournalSnapshot;
  to?: PurchaseRequestJournalSnapshot;
};

export type PurchaseRequestJournalSnapshot =
  | IncomeLinkSnapshot
  | LeadSnapshot
  | SupplierSnapshot
  | QuoteSnapshot
  | PriceSnapshot
  | SelectionSnapshot
  | PurchaseMethodSnapshot
  | RouteDocumentSnapshot;

export type PurchaseRequestJournalAction =
  | 'created'
  | 'updated'
  | 'income_link_changed'
  | 'lead_assigned'
  | 'supplier_added'
  | 'quote_added'
  | 'quote_updated'
  | 'price_fixed'
  | 'supplier_selected'
  | 'agreement_started'
  | 'method_selected'
  | 'route_started';

export type PurchaseRequestJournalEntry = {
  id: string;
  action: string;
  payload: PurchaseRequestJournalPayload;
  comment: string | null;
  actor_id: string;
  actor_name: string | null;
  created_at: string;
};

export type ReplaceIncomeContractPayload = {
  updated_at: string;
  income_contract_id?: string | null;
  income_stage_id?: string | null;
  comment?: string;
};

export type AssignPurchaseRequestLeadPayload = {
  updated_at: string;
  employee_id: string;
};

export type SendPurchaseRequestToAgreementPayload = {
  updated_at: string;
  confirm_expiring_quote?: boolean;
};

export type PartnerEvaluationLetter = 'A' | 'B' | 'C' | 'D';

export type PartnerProcurementFlags = {
  is_approved: boolean;
  evaluation_category: PartnerEvaluationLetter | null;
  /** Взвешенный балл той же оценки, из которой взята категория. */
  evaluation_score: number | null;
  next_reevaluation_date: string | null;
  reevaluation_overdue: boolean;
  blocked_on_project: boolean;
  warnings: string[];
};

export type PurchaseRequestSupplierRow = {
  partner_id: string;
  name: string;
  inn: string;
  added_at: string;
  /** Состояние на момент добавления в запрос — обоснование не переписываем (ЗАП-22). */
  warning_snapshot: PartnerProcurementFlags | null;
  /** Актуальное состояние по проекту запроса на момент чтения карточки. */
  current_flags: PartnerProcurementFlags | null;
};

export type PurchaseRequestSupplierCandidate = {
  partner_id: string;
  name: string;
  inn: string;
  flags: PartnerProcurementFlags;
};

export type AddPurchaseRequestSupplierPayload = {
  updated_at: string;
  partner_id: string;
};

export const PURCHASE_QUOTE_ENTITY_TYPE = 'purchase_quote';

export const QUOTE_PAYMENT_TYPES = ['advance', 'payment'] as const;
export type QuotePaymentType = (typeof QUOTE_PAYMENT_TYPES)[number];

export const QUOTE_DAY_KINDS = ['calendar', 'working'] as const;
export type QuoteDayKind = (typeof QUOTE_DAY_KINDS)[number];

export const SHARE_TOTAL_CENTS = 10_000;

export type VatRateOption = {
  id: string;
  code: string;
  name: string;
  rate: string;
};

export type PurchaseQuotePaymentTerm = {
  line_no: number;
  share: string;
  payment_type: string;
  days: number | null;
  day_kind: string | null;
  base_event: string | null;
};

export type PurchaseQuoteFile = {
  id: string;
  name: string;
  url: string;
  size: string | null;
};

export type PurchaseQuoteRow = {
  id: string;
  request_id: string;
  partner_id: string;
  partner_name: string;
  quote_number: string | null;
  quote_date: string | null;
  valid_until: string | null;
  price: string;
  currency_code: string;
  vat_rate_id: string | null;
  vat_rate_name: string | null;
  vat_percent: string | null;
  delivery_days: number | null;
  warranty_months: number | null;
  contact_name: string | null;
  comment: string | null;
  excluded_from_nmcd: boolean;
  payment_terms: PurchaseQuotePaymentTerm[];
  files: PurchaseQuoteFile[];
  updated_at: string;
  request_updated_at?: string;
};

export type PurchaseQuotePaymentTermPayload = {
  share: number;
  payment_type: QuotePaymentType;
  days?: number | null;
  day_kind?: QuoteDayKind | null;
  base_event?: string | null;
};

export type CreatePurchaseQuotePayload = {
  updated_at: string;
  partner_id: string;
  quote_number?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  price: number;
  currency_code?: string;
  vat_rate_id: string;
  delivery_days?: number | null;
  warranty_months?: number | null;
  contact_name?: string | null;
  comment?: string | null;
  payment_terms: PurchaseQuotePaymentTermPayload[];
};

export type UpdatePurchaseQuotePayload = {
  updated_at: string;
  quote_number?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  price?: number;
  currency_code?: string;
  vat_rate_id?: string;
  delivery_days?: number | null;
  warranty_months?: number | null;
  contact_name?: string | null;
  comment?: string | null;
  payment_terms?: PurchaseQuotePaymentTermPayload[];
};

export const PRICE_METHODS = ['market', 'normative', 'tariff', 'estimate', 'cost', 'impossible'] as const;
export type PriceMethod = (typeof PRICE_METHODS)[number];

export type SelectionReasonOption = {
  code: string;
  name: string;
};

export type ComparisonQuote = {
  quote_id: string;
  partner_id: string;
  partner_name: string;
  price: string;
  net_price: string;
  vat_percent: string | null;
  delivery_days: number | null;
  warranty_months: number | null;
  payment_terms: PurchaseQuotePaymentTerm[];
  valid_until: string | null;
  excluded_from_nmcd: boolean;
  deviation_from_expert: string | null;
  working_days_left: number | null;
  is_expiring: boolean;
};

export type MarketPreview = {
  ok: boolean;
  code?: 'too_few_quotes' | 'too_few_after_filter';
  average_before: string | null;
  average_after: string | null;
  included_quote_ids: string[];
  excluded: { quote_id: string; deviation: string }[];
};

export type PurchaseRequestComparison = {
  expert_price: string | null;
  currency_code: string;
  vat_included: boolean;
  quotes: ComparisonQuote[];
  best: { price: string | null; delivery: string | null; warranty: string | null };
  market_preview: MarketPreview;
  price_method: string | null;
  price_method_note: string | null;
  initial_max_price: string | null;
  nmcd_snapshot: NmcdSnapshot | null;
  selected_quote_id: string | null;
  selection_note: string | null;
  reason_codes: string[];
  request_updated_at: string;
};

export type FixPurchasePricePayload = {
  updated_at: string;
  method: PriceMethod;
  amount?: number | null;
  note?: string | null;
};

export type SelectPurchaseSupplierPayload = {
  updated_at: string;
  quote_id: string;
  reason_codes: string[];
  note?: string | null;
};

export type PurchaseMethodOption = {
  id: string;
  code: string;
  name: string;
  amount_from: string | null;
  amount_to: string | null;
  vat_base: string;
  in_threshold: boolean;
  allowed: boolean;
  requires_justification: boolean;
};

export type PurchaseRequestMethods = {
  amount_net: string | null;
  amount_gross: string | null;
  currency_code: string;
  vat_percent: string | null;
  vat_base_used: string;
  recommended_method_id: string | null;
  selected_method_id: string | null;
  method_justification: string | null;
  request_updated_at: string;
  methods: PurchaseMethodOption[];
};

export type SetPurchaseMethodPayload = {
  updated_at: string;
  method_id: string;
  method_justification?: string | null;
};

export const PURCHASE_ROUTE_KINDS = ['contract', 'tender', 'invoice', 'amendment', 'order'] as const;

export type PurchaseRouteKind = (typeof PURCHASE_ROUTE_KINDS)[number];

export type ChoosePurchaseRoutePayload = {
  updated_at: string;
  kind: PurchaseRouteKind;
  base_contract_id?: string | null;
};
