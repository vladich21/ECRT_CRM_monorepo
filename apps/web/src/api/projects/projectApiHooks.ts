import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Project } from '../../types/referenceTypes';
import { projectApi, ProjectsListParams, ProjectsListResponse } from './projectApi';

export type { ProjectsListParams };

export function useProjectsList(
  params?: ProjectsListParams,
  page?: number,
  pageSize?: number,
): UseQueryResult<ProjectsListResponse, Error> {
  const limit = pageSize ?? 50;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<ProjectsListResponse, Error>({
    queryKey: ['projects', 'list', params ?? {}, page, pageSize],
    queryFn: () => projectApi.getProjectsList(params, limit, offset),
    placeholderData: prev => prev,
  });
}

export const useProjectById = (projectId: string): UseQueryResult<Project, Error> => {
  return useQuery<Project, Error>({
    queryKey: ['projects', projectId],
    queryFn: () => projectApi.getProjectById(projectId),
    enabled: !!projectId,
  });
};

export const useCreateProject = (): UseMutationResult<Project, Error, Project> => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, Project>({
    mutationFn: (data: Project) => projectApi.addProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'projects'),
      });
    },
  });
};

export const useUpdateProject = (): UseMutationResult<
  Project,
  Error,
  {
    id: string;
    data: Partial<Project>;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    Project,
    Error,
    {
      id: string;
      data: Partial<Project>;
    }
  >({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) => projectApi.editProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'projects'),
      });
    },
  });
};

export const useDeleteProject = (): UseMutationResult<Project, Error, string, unknown> => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, string>({
    mutationFn: (projectId: string) => projectApi.deleteProject(projectId),
    onSuccess: () => {
      queueMicrotask(() => {
        queryClient.invalidateQueries({
          predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'projects'),
        });
      });
    },
  });
};

export const useRestoreProject = (): UseMutationResult<Project, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, string>({
    mutationFn: (projectId: string) => projectApi.restoreProject(projectId),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'projects'),
      });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
};
