import type { QueryClient } from '@tanstack/react-query';

import type { PatentListQuery } from './patentApi';

export const patentQueryKeys = {
  all: ['patents'] as const,
  list: (listQuery: PatentListQuery) => [...patentQueryKeys.all, 'list', listQuery] as const,
  detail: (patentId: string) => [...patentQueryKeys.all, patentId] as const,
} as const;

export function invalidatePatentQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: patentQueryKeys.all });
}
