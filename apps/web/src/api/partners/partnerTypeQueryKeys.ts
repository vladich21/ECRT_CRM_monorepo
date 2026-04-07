import type { QueryClient } from '@tanstack/react-query';

export const partnerTypeQueryKeys = {
  all: ['partnerTypes'] as const,
  detail: (partnerTypeId: string) => [...partnerTypeQueryKeys.all, partnerTypeId] as const,
} as const;

export function invalidatePartnerTypeQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: partnerTypeQueryKeys.all });
}
