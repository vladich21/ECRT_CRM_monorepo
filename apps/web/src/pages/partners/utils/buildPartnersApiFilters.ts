import type { PartnerListParams, PartnerListTriStateParam } from '../../../api/partners/partnerApi';
import type { DeletionScope } from '../../../constants/deletionScope';
import type { PartnerFilters, PartnerTriState } from '../PartnerFiltersModal';

function normalizePartnerSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function triToApi(value: PartnerTriState): PartnerListTriStateParam | undefined {
  if (value === 'all') return undefined;
  return value;
}

function triToDeletedScope(value: PartnerTriState): DeletionScope {
  if (value === 'yes') return 'deleted';
  if (value === 'all') return 'all';
  return 'active';
}

export function buildPartnersApiFilters(
  debouncedSearch: string,
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
    deletedScope: triToDeletedScope(appliedFilters.isDeleted),
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
