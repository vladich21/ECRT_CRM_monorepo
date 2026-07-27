import type { QueryClient } from '@tanstack/react-query';

import { ganttKeys } from '../gantt/ganttApiHooks';
import type { ContractsListParams } from './contractApi';

export const contractQueryKeys = {
  all: ['contracts'] as const,
  list: (params: ContractsListParams | undefined, page: number | undefined, pageSize: number | undefined) =>
    [...contractQueryKeys.all, params ?? {}, page, pageSize] as const,
  detail: (contractId: string) => [...contractQueryKeys.all, contractId] as const,
  states: ['contractsStates'] as const,
  categories: ['contractsCategories'] as const,
} as const;

export function invalidateContractQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: contractQueryKeys.all, exact: false }),
    queryClient.invalidateQueries({ queryKey: ganttKeys.all }),
  ]);
}

export function invalidateContractListQueriesAfterDelete(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      predicate: query =>
        query.queryKey[0] === 'contracts' &&
        (query.queryKey.length < 2 || typeof query.queryKey[1] !== 'string'),
    }),
    queryClient.invalidateQueries({ queryKey: ganttKeys.all }),
  ]);
}
