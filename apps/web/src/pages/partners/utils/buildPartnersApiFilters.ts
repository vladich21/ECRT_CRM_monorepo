import type { PartnerListParams, PartnerListTriStateParam } from '../../../api/partners/partnerApi';
import type { PartnerTabCountFilters } from '../../../api/partners/partnerQueryKeys';
import type { DeletionScope } from '../../../constants/deletionScope';
import type { PartnerFilters, PartnerTriState } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

function normalizePartnerSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function triToApi(value: PartnerTriState): PartnerListTriStateParam | undefined {
  if (value === 'all') return undefined;
  return value;
}

export function partnerFiltersToTabCountKey(filters: PartnerFilters): PartnerTabCountFilters {
  return {
    typeIds: [...filters.typeIds],
    statusIds: [...filters.statusIds],
    competenceIds: [...filters.competenceIds],
    categoryIds: [...filters.categoryIds],
    evaluationCategoryTokens: [...filters.evaluationCategoryTokens],
    evaluationRequired: filters.evaluationRequired,
    isKeySupplier: filters.isKeySupplier,
    isTargeted: filters.isTargeted,
    reevaluationOverdue: filters.reevaluationOverdue,
    hasActiveBlocks: filters.hasActiveBlocks,
    isApproved: filters.isApproved,
    legalCheckPassed: filters.legalCheckPassed,
    questionnaireFilled: filters.questionnaireFilled,
    initialAssessmentDone: filters.initialAssessmentDone,
  };
}

export function buildPartnersApiFilters(
  debouncedSearch: string,
  activeTab: PartnerListTab,
  appliedFilters: PartnerFilters,
  sortBy?: PartnerListParams['sortBy'],
  sortOrder?: PartnerListParams['sortOrder'],
): PartnerListParams {
  const search = normalizePartnerSearchQuery(debouncedSearch);
  return {
    search: search || undefined,
    typeIds: appliedFilters.typeIds.length > 0 ? appliedFilters.typeIds : undefined,
    statusIds: appliedFilters.statusIds.length > 0 ? appliedFilters.statusIds : undefined,
    competenceIds: appliedFilters.competenceIds.length > 0 ? appliedFilters.competenceIds : undefined,
    categoryIds: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
    readiness: (activeTab === 'deleted' ? 'all' : activeTab) as 'all' | 'ready' | 'in_progress',
    deletedScope: (activeTab === 'deleted' ? 'deleted' : 'active') as DeletionScope,
    evaluationCategories:
      appliedFilters.evaluationCategoryTokens.length > 0
        ? appliedFilters.evaluationCategoryTokens
        : undefined,
    isKeySupplier: triToApi(appliedFilters.isKeySupplier),
    isTargeted: triToApi(appliedFilters.isTargeted),
    reevaluationOverdue: triToApi(appliedFilters.reevaluationOverdue),
    evaluationRequired: triToApi(appliedFilters.evaluationRequired),
    hasActiveBlocks: triToApi(appliedFilters.hasActiveBlocks),
    isApproved: triToApi(appliedFilters.isApproved),
    legalCheckPassed: triToApi(appliedFilters.legalCheckPassed),
    questionnaireFilled: triToApi(appliedFilters.questionnaireFilled),
    initialAssessmentDone: triToApi(appliedFilters.initialAssessmentDone),
    sortBy,
    sortOrder,
  };
}
