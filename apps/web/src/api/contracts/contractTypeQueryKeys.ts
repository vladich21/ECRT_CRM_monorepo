import type { QueryClient } from '@tanstack/react-query';

export const contractTypeQueryKeys = {
  all: ['contractTypes'] as const,
  detail: (typeId: string) => [...contractTypeQueryKeys.all, typeId] as const,
} as const;

export function invalidateContractTypeQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: contractTypeQueryKeys.all });
}
