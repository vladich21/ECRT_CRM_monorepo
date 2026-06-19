import type { Dayjs } from 'dayjs';

import type { AdvancedFilters, FilterTab } from '../ContractsListPage.types';

function formatDayjsRange(range: [Dayjs, Dayjs] | null): [string, string] | null {
  if (!range?.[0] || !range?.[1]) return null;
  return [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')];
}

export function buildContractsListFiltersResetKey(filters: AdvancedFilters): string {
  return JSON.stringify({
    partnerId: filters.partnerId,
    categoryId: filters.categoryId,
    stateId: filters.stateId,
    dateRange: formatDayjsRange(filters.dateRange),
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
  });
}

export function buildContractsListQueryResetKey(params: {
  debouncedSearch: string;
  activeTab: FilterTab;
  appliedFilters: AdvancedFilters;
  routePartnerId?: string;
}): string {
  return JSON.stringify({
    search: params.debouncedSearch.trim(),
    tab: params.activeTab,
    routePartnerId: params.routePartnerId ?? null,
    filters: buildContractsListFiltersResetKey(params.appliedFilters),
  });
}
