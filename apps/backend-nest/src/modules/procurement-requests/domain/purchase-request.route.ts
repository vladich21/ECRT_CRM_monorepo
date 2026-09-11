export const PURCHASE_ROUTE_KINDS = ['contract', 'tender', 'invoice', 'amendment', 'order'] as const;

export type PurchaseRouteKind = (typeof PURCHASE_ROUTE_KINDS)[number];

export function isPurchaseRouteKind(value: string): value is PurchaseRouteKind {
  return (PURCHASE_ROUTE_KINDS as readonly string[]).includes(value);
}

export function routeKindNeedsBaseContract(kind: PurchaseRouteKind): boolean {
  return kind === 'amendment' || kind === 'order';
}

/** Тендер и счёт в S13 не создаём — явный 422, не тихий noop. */
export function routeKindNotInVersion(kind: PurchaseRouteKind): boolean {
  return kind === 'tender' || kind === 'invoice';
}

export function inactiveBaseContractMessage(kind: 'amendment' | 'order'): string {
  return kind === 'amendment'
    ? 'Нельзя оформить доп. соглашение по неактивному договору'
    : 'Нельзя оформить заказ по неактивному договору';
}

export function notInVersionMessage(kind: PurchaseRouteKind): string {
  switch (kind) {
    case 'tender':
      return 'Тендер не в этой версии';
    case 'invoice':
      return 'Счёт не в этой версии';
    case 'amendment':
      return 'Доп. соглашение не в этой версии';
    case 'order':
      return 'Заказ не в этой версии';
    default:
      return 'Путь оформления не в этой версии';
  }
}
