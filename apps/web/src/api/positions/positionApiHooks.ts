import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { Position } from '../../types/referenceTypes';
import { positionApi } from './positionApi';
import { positionQueryKeys } from './positionQueryKeys';

export const usePositions = (preview?: number): UseQueryResult<Position[], Error> => {
  return useQuery<Position[], Error>({
    queryKey: positionQueryKeys.all,
    queryFn: () => positionApi.getPositions(preview),
  });
};
