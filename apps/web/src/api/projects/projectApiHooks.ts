import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { projectApi } from './projectApi';
import { Project } from '../../types/referenceTypes';

export const useProjects = (preview?: number): UseQueryResult<Project[], Error> => {
  return useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: () => projectApi.getProjects(preview),
  });
};

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
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'projects');
        },
      });
    },
  });
};

export const useUpdateProject = (): UseMutationResult<Project, Error, { id: string; data: Partial<Project> }> => {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, { id: string; data: Partial<Project> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) => projectApi.editProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'projects');
        },
      });
    },
  });
};

export const useDeleteProject = (): UseMutationResult<Project, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, string>({
    mutationFn: (projectId: string) => projectApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'projects');
        },
      });
    },
  });
};
