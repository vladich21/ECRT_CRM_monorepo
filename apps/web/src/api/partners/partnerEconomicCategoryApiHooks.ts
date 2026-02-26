import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { PartnerEconomicCategory } from '../../types/partner';
import { partnerEconomicCategoryApi } from './partnerEconomicCategoryApi';

// 1.2. Получение списка категорий
export const usePartnerEconomicCategories = (): UseQueryResult<PartnerEconomicCategory[], Error> => {
  return useQuery<PartnerEconomicCategory[], Error>({
    queryKey: ['partnerEconomicCategories'],
    queryFn: () => partnerEconomicCategoryApi.getPartnerEconomicCategories(),
  });
};

// 1.3. Получение категории по ID
export const usePartnerEconomicCategoryById = (categoryId: string): UseQueryResult<PartnerEconomicCategory, Error> => {
  return useQuery<PartnerEconomicCategory, Error>({
    queryKey: ['partnerEconomicCategories', categoryId],
    queryFn: () => partnerEconomicCategoryApi.getPartnerEconomicCategoryById(categoryId),
    enabled: !!categoryId,
  });
};

// 1.1. Создание категории
export const useCreatePartnerEconomicCategory = (): UseMutationResult<
  PartnerEconomicCategory,
  Error,
  PartnerEconomicCategory
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerEconomicCategory, Error, PartnerEconomicCategory>({
    mutationFn: (data: PartnerEconomicCategory) => partnerEconomicCategoryApi.createPartnerEconomicCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerEconomicCategories');
        },
      });
    },
  });
};

// 1.4. Обновление категории
export const useUpdatePartnerEconomicCategory = (): UseMutationResult<
  PartnerEconomicCategory,
  Error,
  { id: string; data: Partial<PartnerEconomicCategory> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerEconomicCategory, Error, { id: string; data: Partial<PartnerEconomicCategory> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerEconomicCategory> }) =>
      partnerEconomicCategoryApi.updatePartnerEconomicCategory(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerEconomicCategories');
        },
      });
    },
  });
};

export const useDeletePartnerEconomicCategory = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (categoryId: string) => partnerEconomicCategoryApi.deletePartnerEconomicCategory(categoryId),
    onSuccess: (_, categoryId) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerEconomicCategories');
        },
      });
    },
  });
};
