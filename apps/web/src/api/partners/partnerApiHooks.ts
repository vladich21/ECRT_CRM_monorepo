import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { Partner } from '../../types/partner';
import { partnerApi } from './partnerApi';

export const usePartners = (preview?: number): UseQueryResult<Partner[], Error> => {
  return useQuery<Partner[], Error>({
    queryKey: ['partners'],
    queryFn: () => partnerApi.getPartners(preview),
  });
};

export const usePartnerById = (partnerId: string): UseQueryResult<Partner, Error> => {
  return useQuery<Partner, Error>({
    queryKey: ['partners', partnerId],
    queryFn: () => partnerApi.getPartnerById(partnerId),
    enabled: !!partnerId,
  });
};

export const usePartnerByInn = (): UseMutationResult<Partner, Error, any> => {
  return useMutation<Partner, Error, any>({
    mutationFn: (partnerInn: string) => partnerApi.getPartnerDataByInn(partnerInn),
  });
};

export const useCreatePartner = (): UseMutationResult<Partner, Error, Partner> => {
  const queryClient = useQueryClient();

  return useMutation<Partner, Error, Partner>({
    mutationFn: (data: Partner) => partnerApi.addPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partners');
        },
      });
    },
  });
};

export const useUpdatePartner = (): UseMutationResult<Partner, Error, { id: string; data: Partial<Partner> }> => {
  const queryClient = useQueryClient();

  return useMutation<Partner, Error, { id: string; data: Partial<Partner> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<Partner> }) => partnerApi.editPartner(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partners');
        },
      });
    },
  });
};

export const useDeletePartner = (): UseMutationResult<Partner, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<Partner, Error, string>({
    mutationFn: (partnerId: string) => partnerApi.deletePartner(partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partners');
        },
      });
    },
  });
};
