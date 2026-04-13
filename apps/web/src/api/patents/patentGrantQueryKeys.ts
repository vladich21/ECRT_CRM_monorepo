import type { QueryClient } from '@tanstack/react-query';

export const patentGrantQueryKeys = {
  all: ['patentGrants'] as const,
  entry: (id: string | undefined) => [...patentGrantQueryKeys.all, id] as const,
} as const;

export function invalidatePatentGrantQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: patentGrantQueryKeys.all });
}
