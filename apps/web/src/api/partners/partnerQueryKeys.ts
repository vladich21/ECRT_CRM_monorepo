import type { QueryClient } from '@tanstack/react-query';

import type { PartnerListParams } from './partnerApi';

export const partnerQueryKeys = {
  all: ['partners'] as const,

  list: (filters: PartnerListParams | null, page: number | undefined, pageSize: number | undefined) =>
    [...partnerQueryKeys.all, 'list', filters, page, pageSize] as const,

  detail: (partnerId: string) => [...partnerQueryKeys.all, partnerId] as const,

  contacts: (partnerId?: string) =>
    [...partnerQueryKeys.all, partnerId?.toString() as string | undefined, 'contacts'] as const,

  referenceList: (opts?: { excludeArchived?: boolean }) =>
    [...partnerQueryKeys.all, 'reference', opts?.excludeArchived ? 'exclude-archived' : 'all'] as const,
} as const;

export function invalidatePartnerQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: partnerQueryKeys.all });
}
