import type { PartnerListParams } from '../../../api/partners/partnerApi';
import type { DeletionScope } from '../../../constants/deletionScope';
import type { PartnerFilters } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

export function buildPartnersApiFilters(
  debouncedSearch: string,
  activeTab: PartnerListTab,
  appliedFilters: PartnerFilters,
): PartnerListParams {
  return {
    search: debouncedSearch.trim() || undefined,
    typeIds: appliedFilters.typeIds.length > 0 ? appliedFilters.typeIds : undefined,
    statusIds: appliedFilters.statusIds.length > 0 ? appliedFilters.statusIds : undefined,
    competenceIds: appliedFilters.competenceIds.length > 0 ? appliedFilters.competenceIds : undefined,
    readiness: (activeTab === 'deleted' ? 'all' : activeTab) as 'all' | 'ready' | 'in_progress',
    deletedScope: (activeTab === 'deleted' ? 'deleted' : 'active') as DeletionScope,
  };
}
