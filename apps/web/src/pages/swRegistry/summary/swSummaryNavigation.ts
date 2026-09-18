export type SummaryBy = 'element' | 'item' | 'partner' | 'kind';
export type SummaryScope = 'document' | 'sheet';

export function buildSummaryDrillHref(
  by: SummaryBy,
  rowId: string,
  statusCode: string,
  scope: SummaryScope = 'document',
): string {
  const params = new URLSearchParams();
  if (scope === 'sheet') {
    params.set('sheetStatus', statusCode);
  } else {
    params.set('documentStatus', statusCode);
  }
  if (by === 'item') {
    // Комплект документации программы открывается в структуре: панель программы у дерева.
    params.set('itemId', rowId);
    return `/sw/structure?${params.toString()}`;
  }
  if (by === 'element') params.set('elementId', rowId);
  if (by === 'partner') params.set('partnerId', rowId);
  if (by === 'kind') params.set('developmentKind', rowId);
  return `/sw/items?${params.toString()}`;
}

export const SUMMARY_BY_LABEL: Record<SummaryBy, string> = {
  element: 'Структурный элемент',
  item: 'Программное обеспечение',
  partner: 'Организация',
  kind: 'Вид разработки',
};
