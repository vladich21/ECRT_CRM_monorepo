/** files-service: URL `/purchase_quotes/:id/files`, в БД entitytype без суффикса s. */
export const PURCHASE_QUOTE_FILE_ENTITY_TYPE = 'purchase_quote';

export const QUOTE_PAYMENT_TYPES = ['advance', 'payment'] as const;
export type QuotePaymentType = (typeof QUOTE_PAYMENT_TYPES)[number];

export const QUOTE_DAY_KINDS = ['calendar', 'working'] as const;
export type QuoteDayKind = (typeof QUOTE_DAY_KINDS)[number];

/** numeric(5,2) в копейках доли: 100.00% > 10000. */
export const SHARE_TOTAL_CENTS = 10_000;

export const MAX_PAYMENT_TERM_LINES = 20;

export const PRICE_METHODS = ['market', 'normative', 'tariff', 'estimate', 'cost', 'impossible'] as const;
export type PriceMethod = (typeof PRICE_METHODS)[number];

/** БП-34: выброс строго больше 33% от среднего нетто. */
export const MARKET_OUTLIER_PERCENT = 33;
export const MARKET_MIN_QUOTES = 3;

/** БП-35: предупреждение, если до конца срока КП меньше 5 рабочих дней. */
export const QUOTE_EXPIRING_WORKING_DAYS = 5;
