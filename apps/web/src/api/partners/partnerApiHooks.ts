import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { isValidUuid } from '../../helpers/isValidUuid';
import { Partner } from '../../types/partner';
import { partnerApi, PartnerListParams, PartnersListResponse } from './partnerApi';

export function usePartners(
  filters?: PartnerListParams,
  page?: number,
  pageSize?: number,
): UseQueryResult<PartnersListResponse, Error> {
  const limit = pageSize ?? 20;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<PartnersListResponse, Error>({
    queryKey: ['partners', 'list', filters ?? null, page, pageSize],
    queryFn: () => partnerApi.getPartners(filters, limit, offset),
    placeholderData: previousData => previousData,
  });
}

export const usePartnerById = (partnerId: string): UseQueryResult<Partner, Error> => {
  return useQuery<Partner, Error>({
    queryKey: ['partners', partnerId],
    queryFn: () => partnerApi.getPartnerById(partnerId),
    enabled: isValidUuid(partnerId),
    refetchOnWindowFocus: true,
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
        predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'partners'),
      });
    },
  });
};

export const useUpdatePartner = (): UseMutationResult<
  Partner,
  Error,
  {
    id: string;
    data: Partial<Partner>;
  }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    Partner,
    Error,
    {
      id: string;
      data: Partial<Partner>;
    }
  >({
    mutationFn: ({ id, data }) => partnerApi.editPartner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'partners'),
      });
    },
  });
};

export const useDeletePartner = (): UseMutationResult<Partner, Error, string, unknown> => {
  const queryClient = useQueryClient();
  return useMutation<Partner, Error, string>({
    mutationFn: (partnerId: string) => partnerApi.deletePartner(partnerId),
    onSuccess: () => {
      queueMicrotask(() => {
        queryClient.invalidateQueries({
          predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'partners'),
        });
      });
    },
  });
};

export const useRestorePartner = (): UseMutationResult<Partner, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<Partner, Error, string>({
    mutationFn: (partnerId: string) => partnerApi.restorePartner(partnerId),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        predicate: query => query.queryKey.some(key => typeof key === 'string' && key === 'partners'),
      });
      queryClient.invalidateQueries({ queryKey: ['partners', id] });
    },
  });
};
