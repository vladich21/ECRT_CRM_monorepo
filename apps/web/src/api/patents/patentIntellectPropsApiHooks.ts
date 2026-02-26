import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Reference } from '../../types/referenceTypes';
import { patentIntellectPropsApi } from './patentIntellectPropsApi';

export const usePatentIntellectProps = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: ['patent-statuses'],
    queryFn: () => patentIntellectPropsApi.getPatentIntellectProps(),
  });
};
