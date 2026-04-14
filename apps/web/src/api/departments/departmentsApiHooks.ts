import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { Department } from '../../types/referenceTypes';
import { departmentApi } from './departmentApi';
import { departmentQueryKeys } from './departmentQueryKeys';

export const useDepartments = (preview?: number): UseQueryResult<Department[], Error> => {
  return useQuery<Department[], Error>({
    queryKey: departmentQueryKeys.all,
    queryFn: () => departmentApi.getDepartments(preview),
  });
};
