import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PartnerStatus } from '../../types/partner';
import { partnerStatusApi } from './partnerStatusApi';

export const usePartnerStatuses = (preview?: number): UseQueryResult<PartnerStatus[], Error> => {
  return useQuery<PartnerStatus[], Error>({
    queryKey: ['partnerStatuses'],
    queryFn: () => partnerStatusApi.getPartnerStatuses(preview),
  });
};

export const usePartnerStatusById = (partnerStatusId: string): UseQueryResult<PartnerStatus, Error> => {
  return useQuery<PartnerStatus, Error>({
    queryKey: ['partnerStatuses', partnerStatusId],
    queryFn: () => partnerStatusApi.getPartnerStatusById(partnerStatusId),
    enabled: !!partnerStatusId,
  });
};

export const useCreatePartnerStatus = (): UseMutationResult<PartnerStatus, Error, PartnerStatus> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerStatus, Error, PartnerStatus>({
    mutationFn: (data: PartnerStatus) => partnerStatusApi.addPartnerStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerStatuses');
        },
      });
    },
  });
};

export const useUpdatePartnerStatus = (): UseMutationResult<
  PartnerStatus,
  Error,
  { id: string; data: Partial<PartnerStatus> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerStatus, Error, { id: string; data: Partial<PartnerStatus> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerStatus> }) =>
      partnerStatusApi.editPartnerStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerStatuses');
        },
      });
    },
  });
};

export const useDeletePartnerStatus = (): UseMutationResult<PartnerStatus, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerStatus, Error, string>({
    mutationFn: (partnerStatusId: string) => partnerStatusApi.deletePartnerStatus(partnerStatusId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'partnerStatuses');
        },
      });
    },
  });
};
