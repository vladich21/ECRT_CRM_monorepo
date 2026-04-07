import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { Reference } from '../../types/referenceTypes';
import { patentStatusesApi } from './patentStatusApi';
import { patentStatusQueryKeys } from './patentStatusQueryKeys';

export const usePatentStatuses = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: patentStatusQueryKeys.all,
    queryFn: () => patentStatusesApi.getPatentStatuses(),
  });
};
