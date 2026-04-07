import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { Reference } from '../../types/referenceTypes';
import { patentIntellectPropsApi } from './patentIntellectPropsApi';
import { patentIntellectPropsQueryKeys } from './patentIntellectPropsQueryKeys';

export const usePatentIntellectProps = (): UseQueryResult<Reference[], Error> => {
  return useQuery<Reference[], Error>({
    queryKey: patentIntellectPropsQueryKeys.all,
    queryFn: () => patentIntellectPropsApi.getPatentIntellectProps(),
  });
};
