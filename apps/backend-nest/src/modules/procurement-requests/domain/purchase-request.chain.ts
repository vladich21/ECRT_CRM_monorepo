export type ChainDocumentInput = {
  kind: string;
  entity_id: string;
  title: string | null;
  is_deleted?: boolean;
};

export type ChainBuildInput = {
  request: { id: string; number: number; subject: string };
  income: { id: string; title: string | null; stage: { id: string; title: string | null } | null } | null;
  documents: ChainDocumentInput[];
};

export type PurchaseRequestChain = {
  request: { id: string; number: number; title: string };
  income: { id: string; title: string; stage: { id: string; title: string } | null } | null;
  documents: Array<{ kind: string; id: string; title: string }>;
};

export function chainDocumentFallbackTitle(kind: string): string {
  switch (kind) {
    case 'contract':
      return 'Расходный договор';
    case 'amendment':
      return 'Доп. соглашение';
    case 'order':
      return 'Заказ';
    default:
      return 'Документ';
  }
}

/** Собирает дерево для GET /chain. Без кэша в БД — вызывающий читает живые строки. */
export function buildPurchaseRequestChain(input: ChainBuildInput): PurchaseRequestChain {
  return {
    request: {
      id: input.request.id,
      number: input.request.number,
      title: input.request.subject,
    },
    income: input.income
      ? {
          id: input.income.id,
          title: input.income.title?.trim() || 'Доходный договор',
          stage: input.income.stage
            ? {
                id: input.income.stage.id,
                title: input.income.stage.title?.trim() || 'Этап',
              }
            : null,
        }
      : null,
    documents: input.documents
      .filter(doc => !doc.is_deleted)
      .map(doc => ({
        kind: doc.kind,
        id: doc.entity_id,
        title: doc.title?.trim() || chainDocumentFallbackTitle(doc.kind),
      })),
  };
}
