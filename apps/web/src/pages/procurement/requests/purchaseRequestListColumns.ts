export const PURCHASE_REQUEST_LIST_COLUMN_KEYS = [
  'number',
  'subject',
  'status',
  'project',
  'initiator',
  'lead',
  'amount',
  'request_date',
] as const;

export type PurchaseRequestListColumnKey = (typeof PURCHASE_REQUEST_LIST_COLUMN_KEYS)[number];

export const PURCHASE_REQUEST_LIST_LOCKED_COLUMNS: readonly PurchaseRequestListColumnKey[] = [
  'number',
  'subject',
];

export const PURCHASE_REQUEST_LIST_COLUMN_LABELS: Record<PurchaseRequestListColumnKey, string> = {
  number: '№',
  subject: 'Предмет',
  status: 'Статус',
  project: 'Проект',
  initiator: 'Инициатор',
  lead: 'Ведущий ОУП',
  amount: 'Сумма',
  request_date: 'Дата',
};

export const DEFAULT_PURCHASE_REQUEST_LIST_COLUMNS: PurchaseRequestListColumnKey[] = [
  ...PURCHASE_REQUEST_LIST_COLUMN_KEYS,
];

function isPurchaseRequestListColumnKey(value: unknown): value is PurchaseRequestListColumnKey {
  return (
    typeof value === 'string' &&
    (PURCHASE_REQUEST_LIST_COLUMN_KEYS as readonly string[]).includes(value)
  );
}

export function normalizePurchaseRequestListColumns(raw: unknown): PurchaseRequestListColumnKey[] {
  const incoming = Array.isArray(raw)
    ? raw.filter(isPurchaseRequestListColumnKey)
    : DEFAULT_PURCHASE_REQUEST_LIST_COLUMNS;
  const seen = new Set<PurchaseRequestListColumnKey>();
  const next: PurchaseRequestListColumnKey[] = [];
  for (const key of PURCHASE_REQUEST_LIST_LOCKED_COLUMNS) {
    seen.add(key);
    next.push(key);
  }
  for (const key of incoming) {
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  return next;
}
