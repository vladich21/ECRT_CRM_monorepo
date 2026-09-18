import type { QueryClient } from '@tanstack/react-query';

import type { PurchaseRequestsListParams } from './procurementRequest.types';

export const procurementRequestQueryKeys = {
  all: ['procurement-requests'] as const,
  list: (params: PurchaseRequestsListParams) => [...procurementRequestQueryKeys.all, 'list', params] as const,
  one: (id: string) => [...procurementRequestQueryKeys.all, 'one', id] as const,
  journal: (id: string) => [...procurementRequestQueryKeys.all, 'journal', id] as const,
  suppliers: (id: string) => [...procurementRequestQueryKeys.all, 'suppliers', id] as const,
  supplierCandidates: (id: string, search: string) =>
    [...procurementRequestQueryKeys.all, 'supplier-candidates', id, search] as const,
  quotes: (id: string) => [...procurementRequestQueryKeys.all, 'quotes', id] as const,
  comparison: (id: string) => [...procurementRequestQueryKeys.all, 'comparison', id] as const,
  methods: (id: string) => [...procurementRequestQueryKeys.all, 'methods', id] as const,
  chain: (id: string) => [...procurementRequestQueryKeys.all, 'chain', id] as const,
  vatRates: () => [...procurementRequestQueryKeys.all, 'vat-rates'] as const,
  selectionReasons: () => [...procurementRequestQueryKeys.all, 'selection-reasons'] as const,
};

export function invalidateProcurementRequestQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: procurementRequestQueryKeys.all });
}
