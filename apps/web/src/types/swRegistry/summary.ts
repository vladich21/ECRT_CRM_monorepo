/** Свод: разрезы, строки показателей и итоги. */

export type SwSummaryStatusColumn = {
  code: string;
  name: string;
};

export type SwSummaryRow = {
  id: string;
  name: string;
  parentId?: string | null;
  depth?: number;
  recordState?: string;
  documentCounts: Record<string, number>;
  sheetCounts: Record<string, number>;
  documentsTotal: number;
  sheetsTotal: number;
};

export type SwSummaryTotals = {
  documentCounts: Record<string, number>;
  sheetCounts: Record<string, number>;
  documentsTotal: number;
  sheetsTotal: number;
};

export type SwSummaryResponse = {
  dimension: string;
  generatedAt: string;
  columns: {
    document: SwSummaryStatusColumn[];
    sheet: SwSummaryStatusColumn[];
  };
  documentsTotal: number;
  sheetsTotal: number;
  rows: SwSummaryRow[];
  totals: SwSummaryTotals;
};
