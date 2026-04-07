import type { QueryClient } from '@tanstack/react-query';

export const partnerStatusQueryKeys = {
  all: ['partnerStatuses'] as const,
  detail: (partnerStatusId: string) => [...partnerStatusQueryKeys.all, partnerStatusId] as const,
} as const;

export function invalidatePartnerStatusQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: partnerStatusQueryKeys.all });
}
