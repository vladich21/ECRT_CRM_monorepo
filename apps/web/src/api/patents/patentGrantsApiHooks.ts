import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { PatentGrant } from '../../types/patent';
import { patentGrantsApi } from './patentGrantsApi';

// Получение списка патентных грантов
export const usePatentGrants = (patentId?: string): UseQueryResult<PatentGrant[], Error> => {
  return useQuery<PatentGrant[], Error>({
    queryKey: ['patentGrants', patentId],
    queryFn: () => patentGrantsApi.getPatentGrants(patentId),
    enabled: !!patentId, // Запрос выполняется только если есть patentId
  });
};

// Получение патентного гранта по ID
export const usePatentGrantById = (grantId: string): UseQueryResult<PatentGrant, Error> => {
  return useQuery<PatentGrant, Error>({
    queryKey: ['patentGrants', grantId],
    queryFn: () => patentGrantsApi.getPatentGrantById(grantId),
    enabled: !!grantId,
  });
};

// Создание патентного гранта
type CreatePatentGrantInput = {
  patentId: string;
  data: Omit<PatentGrant, 'id' | 'patent_id' | 'created_at' | 'updated_at'>;
};
export const useCreatePatentGrant = (): UseMutationResult<PatentGrant, Error, CreatePatentGrantInput> => {
  const queryClient = useQueryClient();

  return useMutation<PatentGrant, Error, CreatePatentGrantInput>({
    mutationFn: ({ patentId, data }) => patentGrantsApi.createPatentGrant(patentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'patentGrants');
        },
      });
    },
  });
};

// Обновление патентного гранта
export const useUpdatePatentGrant = (): UseMutationResult<
  PatentGrant,
  Error,
  { id: string; data: Partial<PatentGrant> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PatentGrant, Error, { id: string; data: Partial<PatentGrant> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatentGrant> }) =>
      patentGrantsApi.updatePatentGrant(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'patentGrants');
        },
      });
    },
  });
};

// Удаление патентного гранта
export const useDeletePatentGrant = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (grantId: string) => patentGrantsApi.deletePatentGrant(grantId),
    onSuccess: (_, grantId) => {
      queryClient.removeQueries({ queryKey: ['patentGrants', grantId] });
      queryClient.invalidateQueries({
        predicate: query => query.queryKey[0] === 'patentGrants' && query.queryKey[1] !== grantId,
      });
    },
  });
};
