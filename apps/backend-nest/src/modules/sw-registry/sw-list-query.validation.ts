export type SwItemsListQueryInput = {
  elementId?: string;
  developmentKind?: string;
  partnerId?: string;
  recordState?: string;
  documentStatus?: string;
  sheetStatus?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type SwItemsListQueryParsed = SwItemsListQueryInput & {
  page: number;
  limit: number;
};

/** Чистая валидация GET /api/sw/items — покрывает контрактные проверки §9.1 без БД. */
export function validateSwItemsListQuery(
  query: SwItemsListQueryInput,
  options?: { knownDevelopmentKinds?: Set<string> },
): SwItemsListQueryParsed {
  if (query.recordState === 'deleted') {
    throw new Error('Фильтр recordState=deleted не поддерживается');
  }

  if (query.developmentKind && options?.knownDevelopmentKinds) {
    if (!options.knownDevelopmentKinds.has(query.developmentKind)) {
      throw new Error(`Неверный developmentKind: ${query.developmentKind}`);
    }
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(200, Math.max(1, query.limit ?? 50));

  return { ...query, page, limit };
}
