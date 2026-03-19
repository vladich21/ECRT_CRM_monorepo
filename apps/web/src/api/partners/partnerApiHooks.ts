import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { Partner } from '../../types/partner';
import { partnerApi, PartnerListParams, PartnersListResponse } from './partnerApi';
import { isValidUuid } from '../../helpers/isValidUuid';

export interface PartnersListResult {
  data: Partner[];
  total: number;
}

export function usePartners(
  filters?: PartnerListParams,
  page?: number,
  pageSize?: number,
): UseQueryResult<PartnersListResult, Error> {
  const limit = pageSize ?? 20;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<PartnersListResult, Error>({
    queryKey: ['partners', filters ?? null, page, pageSize],
    queryFn: () => partnerApi.getPartners(filters, limit, offset),
  });
}

export const usePartnerById = (partnerId: string): UseQueryResult<Partner, Error> => {
  return useQuery<Partner, Error>({
    queryKey: ['partners', partnerId],
    queryFn: () => partnerApi.getPartnerById(partnerId),
    enabled: isValidUuid(partnerId),
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
        predicate: (query) => query.queryKey.some((key) => typeof key === 'string' && key === 'partners'),
      });
    },
  });
};

export const useUpdatePartner = (): UseMutationResult<Partner, Error, { id: string; data: Partial<Partner> }> => {
  const queryClient = useQueryClient();
  return useMutation<Partner, Error, { id: string; data: Partial<Partner> }>({
    mutationFn: ({ id, data }) => partnerApi.editPartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.some((key) => typeof key === 'string' && key === 'partners'),
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
        predicate: (query) => query.queryKey.some((key) => typeof key === 'string' && key === 'partners'),
      });
    },
  });
};
