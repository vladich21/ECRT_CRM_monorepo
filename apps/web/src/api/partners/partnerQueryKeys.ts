import type { QueryClient } from '@tanstack/react-query';

import type { PartnerListParams, PartnerListTriStateParam } from './partnerApi';

export const partnerQueryKeys = {
  all: ['partners'] as const,

  list: (filters: PartnerListParams | null, page: number | undefined, pageSize: number | undefined) =>
    [...partnerQueryKeys.all, 'list', filters, page, pageSize] as const,

  detail: (partnerId: string) => [...partnerQueryKeys.all, partnerId] as const,

  tabCount: (tabKey: string, searchTrimmed: string, appliedFilters: PartnerTabCountFilters) =>
    [...partnerQueryKeys.all, 'tab-count', tabKey, searchTrimmed, appliedFilters] as const,

  contacts: (partnerId?: string) =>
    [...partnerQueryKeys.all, partnerId?.toString() as string | undefined, 'contacts'] as const,

  referenceList: (opts?: { excludeArchived?: boolean }) =>
    [...partnerQueryKeys.all, 'reference', opts?.excludeArchived ? 'exclude-archived' : 'all'] as const,
} as const;

export type PartnerTabCountFilters = {
  typeIds: string[];
  statusIds: string[];
  competenceIds: string[];
  categoryIds: string[];
  evaluationCategoryTokens: ('A' | 'B' | 'C' | 'D' | 'none')[];
  evaluationRequired: 'all' | PartnerListTriStateParam;
  isKeySupplier: 'all' | PartnerListTriStateParam;
  isTargeted: 'all' | PartnerListTriStateParam;
  reevaluationOverdue: 'all' | PartnerListTriStateParam;
  hasActiveBlocks: 'all' | PartnerListTriStateParam;
  isApproved: 'all' | PartnerListTriStateParam;
  legalCheckPassed: 'all' | PartnerListTriStateParam;
  questionnaireFilled: 'all' | PartnerListTriStateParam;
  initialAssessmentDone: 'all' | PartnerListTriStateParam;
};

export function invalidatePartnerQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: partnerQueryKeys.all });
}
