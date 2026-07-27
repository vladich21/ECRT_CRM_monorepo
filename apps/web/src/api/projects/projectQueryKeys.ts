import type { QueryClient } from '@tanstack/react-query';

import { ganttKeys } from '../gantt/ganttApiHooks';
import type { ProjectsListParams } from './projectApi';

export const projectQueryKeys = {
  all: ['projects'] as const,
  preview: ['projects', 'preview'] as const,
  list: (params: ProjectsListParams | undefined, page: number | undefined, pageSize: number | undefined) =>
    ['projects', 'list', params ?? {}, page, pageSize] as const,
  detail: (projectId: string) => ['projects', projectId] as const,
} as const;

export function invalidateProjectQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ganttKeys.all }),
  ]);
}
