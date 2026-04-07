import type { QueryClient } from '@tanstack/react-query';

export const patentGrantQueryKeys = {
  all: ['patentGrants'] as const,
  /** Список по patentId или карточка гранта по grantId — второй сегмент может быть undefined до mount */
  entry: (id: string | undefined) => [...patentGrantQueryKeys.all, id] as const,
} as const;

export function invalidatePatentGrantQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: patentGrantQueryKeys.all });
}
