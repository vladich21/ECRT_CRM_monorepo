import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PatentArea } from '../../types/patent';
import { patentAreasApi } from './patentAreasApi';
import { invalidatePatentAreaQueries, patentAreaQueryKeys } from './patentAreaQueryKeys';

export const usePatentAreas = (): UseQueryResult<PatentArea[], Error> => {
  return useQuery<PatentArea[], Error>({
    queryKey: patentAreaQueryKeys.all,
    queryFn: () => patentAreasApi.getPatentAreas(),
  });
};

export const usePatentAreaById = (areaId: string): UseQueryResult<PatentArea, Error> => {
  return useQuery<PatentArea, Error>({
    queryKey: patentAreaQueryKeys.detail(areaId),
    queryFn: () => patentAreasApi.getPatentAreaById(areaId),
    enabled: !!areaId,
  });
};

export const useCreatePatentArea = (): UseMutationResult<PatentArea, Error, PatentArea> => {
  const queryClient = useQueryClient();

  return useMutation<PatentArea, Error, PatentArea>({
    mutationFn: (data: PatentArea) => patentAreasApi.createPatentArea(data),
    onSuccess: () => {
      void invalidatePatentAreaQueries(queryClient);
    },
  });
};

export const useUpdatePatentArea = (): UseMutationResult<
  PatentArea,
  Error,
  { id: string; data: Partial<PatentArea> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PatentArea, Error, { id: string; data: Partial<PatentArea> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatentArea> }) => patentAreasApi.updatePatentArea(id, data),
    onSuccess: () => {
      void invalidatePatentAreaQueries(queryClient);
    },
  });
};

export const useDeletePatentArea = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (areaId: string) => patentAreasApi.deletePatentArea(areaId),
    onSuccess: () => {
      void invalidatePatentAreaQueries(queryClient);
    },
  });
};
