import type { QueryClient } from '@tanstack/react-query';

export const positionQueryKeys = {
  all: ['positions'] as const,
  detail: (positionId: string) => [...positionQueryKeys.all, positionId] as const,
} as const;

export function invalidatePositionQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: positionQueryKeys.all });
}
