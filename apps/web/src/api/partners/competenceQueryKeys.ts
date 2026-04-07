import type { QueryClient } from '@tanstack/react-query';

export const competenceQueryKeys = {
  all: ['competencies'] as const,
  detail: (partnerCompetenceId: string) => [...competenceQueryKeys.all, partnerCompetenceId] as const,
} as const;

export function invalidateCompetenceQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: competenceQueryKeys.all });
}
