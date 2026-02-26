import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { PatentArea } from '../../types/patent';
import { patentAreasApi } from './patentAreasApi';

// 2.2. Получение списка областей патентных заявок
export const usePatentAreas = (): UseQueryResult<PatentArea[], Error> => {
  return useQuery<PatentArea[], Error>({
    queryKey: ['patentAreas'],
    queryFn: () => patentAreasApi.getPatentAreas(),
  });
};

// 2.3. Получение области по ID
export const usePatentAreaById = (areaId: string): UseQueryResult<PatentArea, Error> => {
  return useQuery<PatentArea, Error>({
    queryKey: ['patentAreas', areaId],
    queryFn: () => patentAreasApi.getPatentAreaById(areaId),
    enabled: !!areaId,
  });
};

// 2.1. Создание области
export const useCreatePatentArea = (): UseMutationResult<PatentArea, Error, PatentArea> => {
  const queryClient = useQueryClient();

  return useMutation<PatentArea, Error, PatentArea>({
    mutationFn: (data: PatentArea) => patentAreasApi.createPatentArea(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'patentAreas');
        },
      });
    },
  });
};

// 2.4. Обновление области
export const useUpdatePatentArea = (): UseMutationResult<
  PatentArea,
  Error,
  { id: string; data: Partial<PatentArea> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PatentArea, Error, { id: string; data: Partial<PatentArea> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatentArea> }) => patentAreasApi.updatePatentArea(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'patentAreas');
        },
      });
    },
  });
};

// 2.5. Удаление области
export const useDeletePatentArea = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (areaId: string) => patentAreasApi.deletePatentArea(areaId),
    onSuccess: (_, areaId) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'patentAreas');
        },
      });
    },
  });
};
