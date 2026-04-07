import type { QueryClient } from '@tanstack/react-query';

export const departmentQueryKeys = {
  all: ['departments'] as const,
  detail: (departmentId: string) => [...departmentQueryKeys.all, departmentId] as const,
} as const;

export function invalidateDepartmentQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
}
