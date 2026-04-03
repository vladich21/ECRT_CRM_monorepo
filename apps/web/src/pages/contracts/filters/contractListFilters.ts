import type { AdvancedFilters } from '../list/ContractsListPage.types';

export function countActiveFilters(filters: AdvancedFilters): number {
  const hasPartner = filters.partnerId != null;
  const hasCategory = filters.categoryId != null;
  const hasState = filters.stateId != null;
  const hasDateRange = filters.dateRange?.[0] != null && filters.dateRange?.[1] != null;
  const hasAmount = filters.amountMin != null || filters.amountMax != null;
  return [hasPartner, hasCategory, hasState, hasDateRange, hasAmount].filter(Boolean).length;
}
