import type { QueryClient } from '@tanstack/react-query';

import { ganttKeys } from '../gantt/ganttApiHooks';

export const contractStageQueryKeys = {
  all: ['contract-stages'] as const,
  byContract: (contractId: string) => [...contractStageQueryKeys.all, contractId] as const,
  byStageId: (stageId: string) => [...contractStageQueryKeys.all, stageId] as const,
} as const;

export function invalidateContractStageQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: contractStageQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ganttKeys.all }),
  ]);
}
