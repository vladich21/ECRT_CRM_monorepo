import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ganttApi } from './ganttApi';

export const ganttKeys = {
  all: ['gantt'] as const,
  hierarchy: () => [...ganttKeys.all, 'hierarchy'] as const,
  tasks: (params?: Record<string, string | undefined>) =>
    [...ganttKeys.all, 'tasks', params ?? {}] as const,
  task: (id: string) => [...ganttKeys.all, 'task', id] as const,
};

export function useGanttHierarchy(enabled = true) {
  return useQuery({
    queryKey: ganttKeys.hierarchy(),
    queryFn: () => ganttApi.getHierarchy(),
    enabled,
    staleTime: 60_000,
  });
}

export function useGanttTaskMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ganttKeys.all });
  };

  const createTask = useMutation({
    mutationFn: (body: Record<string, unknown>) => ganttApi.createTask(body),
    onSuccess: invalidate,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      ganttApi.updateTask(id, body),
    onSuccess: invalidate,
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => ganttApi.deleteTask(id),
    onSuccess: invalidate,
  });

  return { createTask, updateTask, deleteTask, invalidate };
}
