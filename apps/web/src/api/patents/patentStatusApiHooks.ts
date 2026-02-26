import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Reference } from '../../types/referenceTypes';
import { patentStatusesApi } from './patentStatusApi';

export const usePatentStatuses = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: ['patent-statuses'],
    queryFn: () => patentStatusesApi.getPatentStatuses(),
  });
};
