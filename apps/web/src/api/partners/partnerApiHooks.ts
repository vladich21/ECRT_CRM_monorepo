import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { isValidUuid } from '../../helpers/isValidUuid';
import { Partner } from '../../types/partner';
import {
  invalidateSupplierEvaluationQueries,
  supplierEvaluationQueryKeys,
} from '../supplierEvaluations/supplierEvaluationQueryKeys';
import { commentQueryKeys } from '../comments/commentQueryKeys';
import {
  partnerApi,
  PartnerListParams,
  type PartnerScoringResponse,
  PartnersListResponse,
  type PartnerSyncRunResult,
  type PartnerSyncStatusResponse,
} from './partnerApi';
import { invalidatePartnerQueries, partnerQueryKeys } from './partnerQueryKeys';

export function usePartners(
  filters?: PartnerListParams,
  page?: number,
  pageSize?: number,
): UseQueryResult<PartnersListResponse, Error> {
  const limit = pageSize ?? 20;
  const offset = page != null && pageSize != null ? (page - 1) * pageSize : 0;
  return useQuery<PartnersListResponse, Error>({
    queryKey: partnerQueryKeys.list(filters ?? null, page, pageSize),
    queryFn: () => partnerApi.getPartners(filters, limit, offset),
    placeholderData: previousData => previousData,
  });
}

export const usePartnerById = (
  partnerId: string,
  initialData?: Partner,
): UseQueryResult<Partner, Error> => {
  return useQuery<Partner, Error>({
    queryKey: partnerQueryKeys.detail(partnerId),
    queryFn: () => partnerApi.getPartnerById(partnerId),
    enabled: isValidUuid(partnerId),
    refetchOnWindowFocus: true,
    initialData: initialData?.id === partnerId ? initialData : undefined,
  });
};

export const usePartnerScoring = (
  partnerId: string | undefined,
  enabled = true,
): UseQueryResult<PartnerScoringResponse, Error> => {
  return useQuery<PartnerScoringResponse, Error>({
    queryKey: partnerQueryKeys.scoring(partnerId ?? ''),
    queryFn: () => partnerApi.getPartnerScoring(partnerId!),
    enabled: enabled && isValidUuid(partnerId ?? ''),
    staleTime: 60 * 60 * 1000,
    retry: false,
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
      void invalidatePartnerQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['reference-data'] });
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
    onSuccess: (_, vars) => {
      void invalidatePartnerQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: supplierEvaluationQueryKeys.partnerKpi(vars.id),
      });
      void queryClient.invalidateQueries({
        queryKey: supplierEvaluationQueryKeys.partnerInitial(vars.id),
      });
      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.byEntity('partner', vars.id),
      });
      void invalidateSupplierEvaluationQueries(queryClient);
    },
  });
};

export const useDeletePartner = (): UseMutationResult<Partner, Error, string, unknown> => {
  const queryClient = useQueryClient();
  return useMutation<Partner, Error, string>({
    mutationFn: (partnerId: string) => partnerApi.deletePartner(partnerId),
    onSuccess: () => {
      queueMicrotask(() => {
        void invalidatePartnerQueries(queryClient);
      });
    },
  });
};

export const useRestorePartner = (): UseMutationResult<Partner, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<Partner, Error, string>({
    mutationFn: (partnerId: string) => partnerApi.restorePartner(partnerId),
    onSuccess: (_, id) => {
      void invalidatePartnerQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: partnerQueryKeys.detail(id) });
    },
  });
};

export const usePartnerSyncNow = (): UseMutationResult<PartnerSyncRunResult, Error, void> => {
  return useMutation<PartnerSyncRunResult, Error, void>({
    mutationFn: () => partnerApi.syncPartnersNow(),
  });
};

export const usePartnerSyncStatus = (): UseQueryResult<PartnerSyncStatusResponse, Error> => {
  return useQuery<PartnerSyncStatusResponse, Error>({
    queryKey: [...partnerQueryKeys.all, 'partner-sync-status'],
    queryFn: () => partnerApi.getPartnerSyncStatus(),
    refetchInterval: 30 * 1000,
  });
};
