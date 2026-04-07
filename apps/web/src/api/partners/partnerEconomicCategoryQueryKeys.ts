import type { QueryClient } from '@tanstack/react-query';

export const partnerEconomicCategoryQueryKeys = {
  all: ['partnerEconomicCategories'] as const,
  detail: (categoryId: string) => [...partnerEconomicCategoryQueryKeys.all, categoryId] as const,
} as const;

export function invalidatePartnerEconomicCategoryQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: partnerEconomicCategoryQueryKeys.all });
}
