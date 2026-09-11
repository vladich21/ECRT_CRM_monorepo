import type { QueryClient } from '@tanstack/react-query';

import { procurementRequestQueryKeys } from '../procurement/requests/procurementRequestQueryKeys';

export const approvalQueryKeys = {
  all: ['approvals'] as const,
  state: (entityType: string, entityId?: string) =>
    [...approvalQueryKeys.all, 'state', entityType, entityId] as const,
  process: (processId: string) => [...approvalQueryKeys.all, 'process', processId] as const,
  startInfo: (routeId: string) => [...approvalQueryKeys.all, 'start-info', routeId] as const,
  myTasks: () => [...approvalQueryKeys.all, 'my-tasks'] as const,
  myTasksCount: () => [...approvalQueryKeys.all, 'my-tasks', 'count'] as const,
  myInitiated: () => [...approvalQueryKeys.all, 'my-initiated'] as const,
  myParticipated: () => [...approvalQueryKeys.all, 'my-participated'] as const,
  tasks: () => [...approvalQueryKeys.all, 'tasks'] as const,
  routes: (entityType?: string) => [...approvalQueryKeys.all, 'routes', entityType ?? 'all'] as const,
  route: (routeId: string) => [...approvalQueryKeys.all, 'route', routeId] as const,
  references: () => [...approvalQueryKeys.all, 'references'] as const,
};

export function invalidateApprovalQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: procurementRequestQueryKeys.all }),
  ]);
}
