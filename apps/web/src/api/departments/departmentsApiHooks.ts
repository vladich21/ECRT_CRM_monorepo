import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Department } from '../../types/referenceTypes';
import { departmentApi } from './departmentApi';
import { departmentQueryKeys, invalidateDepartmentQueries } from './departmentQueryKeys';

export const useDepartments = (preview?: number): UseQueryResult<Department[], Error> => {
  return useQuery<Department[], Error>({
    queryKey: departmentQueryKeys.all,
    queryFn: () => departmentApi.getDepartments(preview),
  });
};

export const useDepartmentById = (departmentId: string): UseQueryResult<Department, Error> => {
  return useQuery<Department, Error>({
    queryKey: departmentQueryKeys.detail(departmentId),
    queryFn: () => departmentApi.getDepartmentById(departmentId),
    enabled: !!departmentId,
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
    onSuccess: () => {
      void invalidateDepartmentQueries(queryClient);
    },
  });
};
