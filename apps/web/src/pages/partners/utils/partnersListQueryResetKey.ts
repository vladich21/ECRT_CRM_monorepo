import type { PartnerListSortBy } from '../../../api/partners/partnerApi';

import type { PartnerFilters } from '../PartnerFiltersModal';

/** Ключ параметров серверного запроса (без page). При изменении - сброс на 1-ю страницу. */
export function buildPartnersListQueryResetKey(params: {
  debouncedSearch: string;
  appliedFilters: PartnerFilters;
  sortBy: PartnerListSortBy;
  sortOrder: 'asc' | 'desc';
}): string {
  const { debouncedSearch, appliedFilters, sortBy, sortOrder } = params;
  return JSON.stringify({
    search: debouncedSearch.trim(),
    filters: {
      typeIds: [...appliedFilters.typeIds].sort(),
      statusIds: [...appliedFilters.statusIds].sort(),
      competenceIds: [...appliedFilters.competenceIds].sort(),
      categoryIds: [...appliedFilters.categoryIds].sort(),
      evaluationCategoryTokens: [...appliedFilters.evaluationCategoryTokens].sort(),
      evaluationRequired: appliedFilters.evaluationRequired,
      isKeySupplier: appliedFilters.isKeySupplier,
      isTargeted: appliedFilters.isTargeted,
      reevaluationOverdue: appliedFilters.reevaluationOverdue,
      hasActiveBlocks: appliedFilters.hasActiveBlocks,
      isApproved: appliedFilters.isApproved,
      isDeleted: appliedFilters.isDeleted,
      legalCheckPassed: appliedFilters.legalCheckPassed,
      questionnaireFilled: appliedFilters.questionnaireFilled,
      initialAssessmentDone: appliedFilters.initialAssessmentDone,
    },
    sortBy,
    sortOrder,
  });
}
