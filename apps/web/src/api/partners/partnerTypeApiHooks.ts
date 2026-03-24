import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PartnerType } from '../../types/partner';
import { partnerTypeApi } from './partnerTypeApi';

export const usePartnerTypes = (preview?: number): UseQueryResult<PartnerType[], Error> => {
  return useQuery<PartnerType[], Error>({
    queryKey: ['partnerTypes'],
    queryFn: () => partnerTypeApi.getPartnerTypes(preview),
  });
};

export const usePartnerTypeById = (partnerTypeId: string): UseQueryResult<PartnerType, Error> => {
  return useQuery<PartnerType, Error>({
    queryKey: ['partnerTypes', partnerTypeId],
    queryFn: () => partnerTypeApi.getPartnerTypeById(partnerTypeId),
    enabled: !!partnerTypeId,
  });
};

export const useCreatePartnerType = (): UseMutationResult<PartnerType, Error, PartnerType> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerType, Error, PartnerType>({
    mutationFn: (data: PartnerType) => partnerTypeApi.addPartnerType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerTypes');
        },
      });
    },
  });
};

export const useUpdatePartnerType = (): UseMutationResult<
  PartnerType,
  Error,
  { id: string; data: Partial<PartnerType> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerType, Error, { id: string; data: Partial<PartnerType> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerType> }) => partnerTypeApi.editPartnerType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerTypes');
        },
      });
    },
  });
};

export const useDeletePartnerType = (): UseMutationResult<PartnerType, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerType, Error, string>({
    mutationFn: (partnerTypeId: string) => partnerTypeApi.deletePartnerType(partnerTypeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerTypes');
        },
      });
    },
  });
};
