import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Department } from '../../types/referenceTypes';
import { departmentApi } from './departmentApi';

export const useDepartments = (preview?: number): UseQueryResult<Department[], Error> => {
  return useQuery<Department[], Error>({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getDepartments(preview),
  });
};

export const useDepartmentById = (departmentId: string): UseQueryResult<Department, Error> => {
  return useQuery<Department, Error>({
    queryKey: ['departments', departmentId],
    queryFn: () => departmentApi.getDepartmentById(departmentId),
    enabled: !!departmentId,
  });
};

export const useCreateDepartment = (): UseMutationResult<Department, Error, Department> => {
  const queryClient = useQueryClient();

  return useMutation<Department, Error, Department>({
    mutationFn: (data: Department) => departmentApi.addDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'departments');
        },
      });
    },
  });
};

export const useUpdateDepartment = (): UseMutationResult<
  Department,
  Error,
  { id: string; data: Partial<Department> }
> => {
  const queryClient = useQueryClient();

  return useMutation<Department, Error, { id: string; data: Partial<Department> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) => departmentApi.editDepartment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'departments');
        },
      });
    },
  });
};

export const useDeleteDepartment = (): UseMutationResult<Department, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<Department, Error, string>({
    mutationFn: (departmentId: string) => departmentApi.deleteDepartment(departmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'departments');
        },
      });
    },
  });
};
