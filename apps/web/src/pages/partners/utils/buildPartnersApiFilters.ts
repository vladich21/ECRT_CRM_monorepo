import type { PartnerListParams, PartnerListTriStateParam } from '../../../api/partners/partnerApi';
import type { PartnerTabCountFilters } from '../../../api/partners/partnerQueryKeys';
import type { DeletionScope } from '../../../constants/deletionScope';
import type { PartnerFilters, PartnerTriState } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

function normalizePartnerSearchQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function triToApi(v: PartnerTriState): PartnerListTriStateParam | undefined {
  if (v === 'all') return undefined;
  return v;
}

export function partnerFiltersToTabCountKey(f: PartnerFilters): PartnerTabCountFilters {
  return {
    typeIds: [...f.typeIds],
    statusIds: [...f.statusIds],
    competenceIds: [...f.competenceIds],
    evaluationCategoryTokens: [...f.evaluationCategoryTokens],
    isKeySupplier: f.isKeySupplier,
    isTargeted: f.isTargeted,
    reevaluationOverdue: f.reevaluationOverdue,
    hasActiveBlocks: f.hasActiveBlocks,
    isApproved: f.isApproved,
    legalCheckPassed: f.legalCheckPassed,
    questionnaireFilled: f.questionnaireFilled,
    initialAssessmentDone: f.initialAssessmentDone,
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
    readiness: (activeTab === 'deleted' ? 'all' : activeTab) as 'all' | 'ready' | 'in_progress',
    deletedScope: (activeTab === 'deleted' ? 'deleted' : 'active') as DeletionScope,
    evaluationCategories:
      appliedFilters.evaluationCategoryTokens.length > 0
        ? appliedFilters.evaluationCategoryTokens
        : undefined,
    isKeySupplier: triToApi(appliedFilters.isKeySupplier),
    isTargeted: triToApi(appliedFilters.isTargeted),
    reevaluationOverdue: triToApi(appliedFilters.reevaluationOverdue),
    hasActiveBlocks: triToApi(appliedFilters.hasActiveBlocks),
    isApproved: triToApi(appliedFilters.isApproved),
    legalCheckPassed: triToApi(appliedFilters.legalCheckPassed),
    questionnaireFilled: triToApi(appliedFilters.questionnaireFilled),
    initialAssessmentDone: triToApi(appliedFilters.initialAssessmentDone),
    sortBy,
    sortOrder,
  };
}
