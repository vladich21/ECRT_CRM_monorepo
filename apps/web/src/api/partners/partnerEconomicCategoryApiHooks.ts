import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PartnerEconomicCategory } from '../../types/partner';
import { partnerEconomicCategoryApi } from './partnerEconomicCategoryApi';
import {
  invalidatePartnerEconomicCategoryQueries,
  partnerEconomicCategoryQueryKeys,
} from './partnerEconomicCategoryQueryKeys';

export const usePartnerEconomicCategories = (): UseQueryResult<PartnerEconomicCategory[], Error> => {
  return useQuery<PartnerEconomicCategory[], Error>({
    queryKey: partnerEconomicCategoryQueryKeys.all,
    queryFn: () => partnerEconomicCategoryApi.getPartnerEconomicCategories(),
  });
};

export const usePartnerEconomicCategoryById = (categoryId: string): UseQueryResult<PartnerEconomicCategory, Error> => {
  return useQuery<PartnerEconomicCategory, Error>({
    queryKey: partnerEconomicCategoryQueryKeys.detail(categoryId),
    queryFn: () => partnerEconomicCategoryApi.getPartnerEconomicCategoryById(categoryId),
    enabled: !!categoryId,
  });
};

export const useCreatePartnerEconomicCategory = (): UseMutationResult<
  PartnerEconomicCategory,
  Error,
  PartnerEconomicCategory
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerEconomicCategory, Error, PartnerEconomicCategory>({
    mutationFn: (data: PartnerEconomicCategory) => partnerEconomicCategoryApi.createPartnerEconomicCategory(data),
    onSuccess: () => {
      void invalidatePartnerEconomicCategoryQueries(queryClient);
    },
  });
};

export const useUpdatePartnerEconomicCategory = (): UseMutationResult<
  PartnerEconomicCategory,
  Error,
  { id: string; data: Partial<PartnerEconomicCategory> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerEconomicCategory, Error, { id: string; data: Partial<PartnerEconomicCategory> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerEconomicCategory> }) =>
      partnerEconomicCategoryApi.updatePartnerEconomicCategory(id, data),
    onSuccess: () => {
      void invalidatePartnerEconomicCategoryQueries(queryClient);
    },
  });
};

export const useDeletePartnerEconomicCategory = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (categoryId: string) => partnerEconomicCategoryApi.deletePartnerEconomicCategory(categoryId),
    onSuccess: () => {
      void invalidatePartnerEconomicCategoryQueries(queryClient);
    },
  });
};
