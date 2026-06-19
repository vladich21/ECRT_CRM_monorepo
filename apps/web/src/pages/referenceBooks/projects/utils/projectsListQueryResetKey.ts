import type { Dayjs } from 'dayjs';

import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';

function formatDayjsRange(range: [Dayjs, Dayjs] | null): [string, string] | null {
  if (!range?.[0] || !range?.[1]) return null;
  return [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')];
}

export function buildProjectsListFiltersResetKey(filters: ProjectAdvancedFilters): string {
  return JSON.stringify({
    managerId: filters.managerId,
    purchaserId: filters.purchaserId,
    overlapRange: formatDayjsRange(filters.overlapRange),
    startDateRange: formatDayjsRange(filters.startDateRange),
    endDateRange: formatDayjsRange(filters.endDateRange),
    endDatePresence: filters.endDatePresence,
  });
}

export function buildProjectsListQueryResetKey(params: {
  debouncedSearch: string;
  activeTab: ProjectFilterTab;
  appliedFilters: ProjectAdvancedFilters;
}): string {
  return JSON.stringify({
    search: params.debouncedSearch.trim(),
    tab: params.activeTab,
    filters: buildProjectsListFiltersResetKey(params.appliedFilters),
  });
}
