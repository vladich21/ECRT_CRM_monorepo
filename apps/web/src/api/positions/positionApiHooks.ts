import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { Position } from '../../types/referenceTypes';
import { positionApi } from './positionApi';
import { invalidatePositionQueries, positionQueryKeys } from './positionQueryKeys';

export const usePositions = (preview?: number): UseQueryResult<Position[], Error> => {
  return useQuery<Position[], Error>({
    queryKey: positionQueryKeys.all,
    queryFn: () => positionApi.getPositions(preview),
  });
};

export const usePositionById = (positionId: string): UseQueryResult<Position, Error> => {
  return useQuery<Position, Error>({
    queryKey: positionQueryKeys.detail(positionId),
    queryFn: () => positionApi.getPositionById(positionId),
    enabled: !!positionId,
  });
};

export const useCreatePosition = (): UseMutationResult<Position, Error, Position> => {
  const queryClient = useQueryClient();

  return useMutation<Position, Error, Position>({
    mutationFn: (data: Position) => positionApi.addPosition(data),
    onSuccess: () => {
      void invalidatePositionQueries(queryClient);
    },
  });
};

export const useUpdatePosition = (): UseMutationResult<Position, Error, { id: string; data: Partial<Position> }> => {
  const queryClient = useQueryClient();

  return useMutation<Position, Error, { id: string; data: Partial<Position> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Position> }) => positionApi.editPosition(id, data),
    onSuccess: () => {
      void invalidatePositionQueries(queryClient);
    },
  });
};

export const useDeletePosition = (): UseMutationResult<Position, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<Position, Error, string>({
    mutationFn: (positionId: string) => positionApi.deletePosition(positionId),
    onSuccess: () => {
      void invalidatePositionQueries(queryClient);
    },
  });
};
