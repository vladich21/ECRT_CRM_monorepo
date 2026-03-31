import type { AdvancedFilters } from '../ContractsListPage.types';

export function validateAmountFilters(filters: AdvancedFilters): string | null {
  if (filters.amountMin != null && filters.amountMax != null && filters.amountMin > filters.amountMax) {
    return 'Минимальная сумма не может быть больше максимальной';
  }
  return null;
}
