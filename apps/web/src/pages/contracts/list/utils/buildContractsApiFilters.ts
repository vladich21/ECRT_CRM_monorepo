import type { ContractsListParams } from '../../../../api/contracts/contractApi';
import type { AdvancedFilters, FilterTab } from '../ContractsListPage.types';

type BuildContractsApiFiltersArgs = {
  effectivePartnerId?: string;
  debouncedSearch: string;
  activeTab: FilterTab;
  appliedFilters: AdvancedFilters;
};

export function buildContractsApiFilters({
  effectivePartnerId,
  debouncedSearch,
  activeTab,
  appliedFilters,
}: BuildContractsApiFiltersArgs): ContractsListParams {
  const base: ContractsListParams = {
    partner_id: effectivePartnerId || undefined,
    search: debouncedSearch || undefined,
    list_tab: activeTab === 'deleted' ? 'all' : activeTab,
    deleted_scope: activeTab === 'deleted' ? 'deleted' : 'active',
  };

  if (appliedFilters.categoryId) {
    base.category_id = appliedFilters.categoryId;
  }
  if (appliedFilters.stateId) {
    base.state_id = appliedFilters.stateId;
  }
  if (appliedFilters.dateRange?.[0] && appliedFilters.dateRange?.[1]) {
    base.date_from = appliedFilters.dateRange[0].format('YYYY-MM-DD');
    base.date_to = appliedFilters.dateRange[1].format('YYYY-MM-DD');
  }
  if (appliedFilters.amountMin != null) {
    base.amount_min = appliedFilters.amountMin;
  }
  if (appliedFilters.amountMax != null) {
    base.amount_max = appliedFilters.amountMax;
  }

  return base;
}
