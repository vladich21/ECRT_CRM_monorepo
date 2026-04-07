import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PartnerStatus } from '../../types/partner';
import { partnerStatusApi } from './partnerStatusApi';
import { invalidatePartnerStatusQueries, partnerStatusQueryKeys } from './partnerStatusQueryKeys';

export const usePartnerStatuses = (preview?: number): UseQueryResult<PartnerStatus[], Error> => {
  return useQuery<PartnerStatus[], Error>({
    queryKey: partnerStatusQueryKeys.all,
    queryFn: () => partnerStatusApi.getPartnerStatuses(preview),
  });
};

export const usePartnerStatusById = (partnerStatusId: string): UseQueryResult<PartnerStatus, Error> => {
  return useQuery<PartnerStatus, Error>({
    queryKey: partnerStatusQueryKeys.detail(partnerStatusId),
    queryFn: () => partnerStatusApi.getPartnerStatusById(partnerStatusId),
    enabled: !!partnerStatusId,
  });
};

export const useCreatePartnerStatus = (): UseMutationResult<PartnerStatus, Error, PartnerStatus> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerStatus, Error, PartnerStatus>({
    mutationFn: (data: PartnerStatus) => partnerStatusApi.addPartnerStatus(data),
    onSuccess: () => {
      void invalidatePartnerStatusQueries(queryClient);
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
    onSuccess: () => {
      void invalidatePartnerStatusQueries(queryClient);
    },
  });
};

export const useDeletePartnerStatus = (): UseMutationResult<PartnerStatus, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerStatus, Error, string>({
    mutationFn: (partnerStatusId: string) => partnerStatusApi.deletePartnerStatus(partnerStatusId),
    onSuccess: () => {
      void invalidatePartnerStatusQueries(queryClient);
    },
  });
};
