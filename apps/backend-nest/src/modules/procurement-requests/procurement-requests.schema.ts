import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * ФС-1 закупки. FK на contracts/partners/users в SQL точечные между нашими
 * таблицами; на чужие сущности — uuid без drizzle-FK (как gantt_*).
 */

export const refVatRates = pgTable(
  'ref_vat_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 80 }).notNull(),
    rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('ref_vat_rates_code_uidx').on(t.code)],
);

export const refPurchaseSelectionReasons = pgTable('ref_purchase_selection_reasons', {
  code: varchar('code', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const refPurchaseMethods = pgTable(
  'ref_purchase_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 40 }).notNull(),
    name: varchar('name', { length: 60 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [uniqueIndex('ref_purchase_methods_code_uidx').on(t.code)],
);

export const purchaseMethodThresholds = pgTable(
  'purchase_method_thresholds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    methodId: uuid('method_id').notNull(),
    amountFrom: numeric('amount_from', { precision: 15, scale: 2 }),
    amountTo: numeric('amount_to', { precision: 15, scale: 2 }),
    vatBase: varchar('vat_base', { length: 10 }).notNull().default('net'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [index('purchase_method_thresholds_method_idx').on(t.methodId)],
);

export type NmcdSnapshotQuote = {
  quote_id: string;
  partner_name: string | null;
  gross: string;
  net: string;
  vat_percent: string | null;
  deviation?: string;
};

/** Состав НМЦД на момент POST /price — не пересчитывать на лету (ЗАП-22). */
export type NmcdSnapshot = {
  method: string;
  amount: string | null;
  note: string | null;
  average_before: string | null;
  average_after: string | null;
  included: NmcdSnapshotQuote[];
  excluded: NmcdSnapshotQuote[];
};

export const purchaseRequests = pgTable(
  'purchase_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: integer('number').notNull(),
    requestDate: date('request_date').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    projectId: uuid('project_id').notNull(),
    incomeContractId: uuid('income_contract_id'),
    incomeStageId: uuid('income_stage_id'),
    subject: varchar('subject', { length: 2000 }).notNull(),
    justification: varchar('justification', { length: 2000 }).notNull(),
    requiredDate: date('required_date').notNull(),
    departmentId: uuid('department_id').notNull(),
    techAcceptorId: uuid('tech_acceptor_id').notNull(),
    expertPrice: numeric('expert_price', { precision: 15, scale: 2 }),
    amount: numeric('amount', { precision: 15, scale: 2 }),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('RUB'),
    vatRateId: uuid('vat_rate_id'),
    vatIncluded: boolean('vat_included').notNull().default(true),
    fundingSource: varchar('funding_source', { length: 30 }),
    priceMethod: varchar('price_method', { length: 30 }),
    priceMethodNote: text('price_method_note'),
    initialMaxPrice: numeric('initial_max_price', { precision: 15, scale: 2 }),
    nmcdSnapshot: jsonb('nmcd_snapshot').$type<NmcdSnapshot>(),
    isUrgent: boolean('is_urgent').notNull().default(false),
    selectedQuoteId: uuid('selected_quote_id'),
    selectionNote: text('selection_note'),
    purchaseMethodId: uuid('purchase_method_id'),
    methodJustification: text('method_justification'),
    initiatorId: uuid('initiator_id').notNull(),
    leadManagerId: uuid('lead_manager_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    uniqueIndex('purchase_requests_number_uidx').on(t.number),
    index('purchase_requests_status_idx').on(t.status),
    index('purchase_requests_project_idx').on(t.projectId),
    index('purchase_requests_income_contract_idx').on(t.incomeContractId),
    index('purchase_requests_urgent_idx').on(t.isUrgent),
  ],
);

export type PurchaseRequestSupplierWarningSnapshot = {
  is_approved: boolean;
  evaluation_category: 'A' | 'B' | 'C' | 'D' | null;
  next_reevaluation_date: string | null;
  reevaluation_overdue: boolean;
  blocked_on_project: boolean;
  warnings: string[];
};

export const purchaseRequestSuppliers = pgTable(
  'purchase_request_suppliers',
  {
    requestId: uuid('request_id').notNull(),
    partnerId: uuid('partner_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    warningSnapshot: jsonb('warning_snapshot').$type<PurchaseRequestSupplierWarningSnapshot>(),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.partnerId] })],
);

export const purchaseQuotes = pgTable(
  'purchase_quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull(),
    partnerId: uuid('partner_id').notNull(),
    quoteNumber: varchar('quote_number', { length: 60 }),
    quoteDate: date('quote_date'),
    validUntil: date('valid_until'),
    price: numeric('price', { precision: 15, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('RUB'),
    vatRateId: uuid('vat_rate_id'),
    deliveryDays: integer('delivery_days'),
    warrantyMonths: integer('warranty_months'),
    contactName: text('contact_name'),
    comment: text('comment'),
    excludedFromNmcd: boolean('excluded_from_nmcd').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('purchase_quotes_request_partner_uidx').on(t.requestId, t.partnerId),
    index('purchase_quotes_request_idx').on(t.requestId),
  ],
);

export const purchaseQuotePaymentTerms = pgTable(
  'purchase_quote_payment_terms',
  {
    quoteId: uuid('quote_id').notNull(),
    lineNo: integer('line_no').notNull(),
    share: numeric('share', { precision: 5, scale: 2 }).notNull(),
    paymentType: varchar('payment_type', { length: 20 }).notNull(),
    days: integer('days'),
    dayKind: varchar('day_kind', { length: 12 }),
    baseEvent: varchar('base_event', { length: 40 }),
  },
  (t) => [primaryKey({ columns: [t.quoteId, t.lineNo] })],
);

export const purchaseRequestSelectionReasons = pgTable(
  'purchase_request_selection_reasons',
  {
    requestId: uuid('request_id').notNull(),
    reasonCode: varchar('reason_code', { length: 40 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.reasonCode] })],
);

export type PurchaseRequestEventAction =
  | 'created'
  | 'updated'
  | 'income_link_changed'
  | 'lead_assigned'
  | 'supplier_added'
  | 'quote_added'
  | 'quote_updated'
  | 'price_fixed'
  | 'supplier_selected';

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

export type PurchaseRequestEventPayload = {
  fields?: string[];
  from?:
    | IncomeLinkSnapshot
    | LeadSnapshot
    | SupplierSnapshot
    | QuoteSnapshot
    | PriceSnapshot
    | SelectionSnapshot
    | PurchaseMethodSnapshot
    | RouteDocumentSnapshot;
  to?:
    | IncomeLinkSnapshot
    | LeadSnapshot
    | SupplierSnapshot
    | QuoteSnapshot
    | PriceSnapshot
    | SelectionSnapshot
    | PurchaseMethodSnapshot
    | RouteDocumentSnapshot;
};

export const purchaseRequestEvents = pgTable(
  'purchase_request_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull(),
    action: varchar('action', { length: 40 }).notNull(),
    payload: jsonb('payload').$type<PurchaseRequestEventPayload>().notNull().default({}),
    comment: text('comment'),
    actorId: uuid('actor_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [    index('purchase_request_events_request_idx').on(t.requestId, t.createdAt)],
);

/** S13: запрос > расходный договор. ДС/заказ появятся в ФС-2 теми же kind. */
export const purchaseRequestDocuments = pgTable(
  'purchase_request_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull(),
    kind: varchar('kind', { length: 20 }).notNull(),
    entityType: varchar('entity_type', { length: 40 }).notNull().default('contract'),
    entityId: uuid('entity_id').notNull(),
    baseContractId: uuid('base_contract_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
  },
  (t) => [index('purchase_request_documents_request_idx').on(t.requestId, t.createdAt)],
);
