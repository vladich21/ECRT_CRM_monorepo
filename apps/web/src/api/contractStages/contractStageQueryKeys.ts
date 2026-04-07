import type { QueryClient } from '@tanstack/react-query';

export const contractStageQueryKeys = {
  all: ['contract-stages'] as const,
  byContract: (contractId: string) => [...contractStageQueryKeys.all, contractId] as const,
  byStageId: (stageId: string) => [...contractStageQueryKeys.all, stageId] as const,
} as const;

export function invalidateContractStageQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: contractStageQueryKeys.all });
}
