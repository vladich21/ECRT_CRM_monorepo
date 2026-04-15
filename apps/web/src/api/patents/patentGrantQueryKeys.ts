import type { QueryClient } from '@tanstack/react-query';

import type { PatentGrantsRegistryListQuery } from './patentGrantsApi';

export type { PatentGrantsRegistryListQuery };

export const patentGrantQueryKeys = {
  all: ['patentGrants'] as const,
  listByPatentId: (patentId: string | undefined) =>
    [...patentGrantQueryKeys.all, 'byPatent', patentId] as const,
  detail: (grantId: string | undefined) => [...patentGrantQueryKeys.all, 'detail', grantId] as const,
  registryList: (query: PatentGrantsRegistryListQuery) =>
    [...patentGrantQueryKeys.all, 'registry', query] as const,
} as const;

export function invalidatePatentGrantQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: patentGrantQueryKeys.all });
}
