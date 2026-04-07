import type { QueryClient } from '@tanstack/react-query';

export const contractStageStateQueryKeys = {
  all: ['contract-stage-states'] as const,
  detail: (stateId: string) => [...contractStageStateQueryKeys.all, stateId] as const,
} as const;

export function invalidateContractStageStateQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: contractStageStateQueryKeys.all });
}
