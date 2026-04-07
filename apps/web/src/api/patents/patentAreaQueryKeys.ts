import type { QueryClient } from '@tanstack/react-query';

export const patentAreaQueryKeys = {
  all: ['patentAreas'] as const,
  detail: (areaId: string) => [...patentAreaQueryKeys.all, areaId] as const,
} as const;

export function invalidatePatentAreaQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: patentAreaQueryKeys.all });
}
