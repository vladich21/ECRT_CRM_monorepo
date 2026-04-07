import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PartnerCompetence } from '../../types/partner';
import { partnerCompetenceApi } from './partnerCompetenceApi';
import { competenceQueryKeys, invalidateCompetenceQueries } from './competenceQueryKeys';

export const usePartnerCompetencies = (): UseQueryResult<PartnerCompetence[], Error> => {
  return useQuery<PartnerCompetence[], Error>({
    queryKey: competenceQueryKeys.all,
    queryFn: () => partnerCompetenceApi.getPartnerCompetencies(),
  });
};

export const usePartnerCompetenceById = (partnerCompetenceId: string): UseQueryResult<PartnerCompetence, Error> => {
  return useQuery<PartnerCompetence, Error>({
    queryKey: competenceQueryKeys.detail(partnerCompetenceId),
    queryFn: () => partnerCompetenceApi.getPartnerCompetenceById(partnerCompetenceId),
    enabled: !!partnerCompetenceId,
  });
};

export const useCreatePartnerCompetence = (): UseMutationResult<
  PartnerCompetence,
  Error,
  Pick<PartnerCompetence, 'name'>
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerCompetence, Error, Pick<PartnerCompetence, 'name'>>({
    mutationFn: (data: Pick<PartnerCompetence, 'name'>) => partnerCompetenceApi.addPartnerCompetence(data),
    onSuccess: () => {
      void invalidateCompetenceQueries(queryClient);
    },
  });
};

export const useUpdatePartnerCompetence = (): UseMutationResult<
  PartnerCompetence,
  Error,
  { id: string; data: Partial<Pick<PartnerCompetence, 'name'>> }
> => {
  const queryClient = useQueryClient();

  return useMutation<
    PartnerCompetence,
    Error,
    { id: string; data: Partial<Pick<PartnerCompetence, 'name'>> }
  >({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<PartnerCompetence, 'name'>> }) =>
      partnerCompetenceApi.editPartnerCompetence(id, data),
    onSuccess: () => {
      void invalidateCompetenceQueries(queryClient);
    },
  });
};

export const useDeletePartnerCompetence = (): UseMutationResult<PartnerCompetence, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerCompetence, Error, string>({
    mutationFn: (partnerCompetenceId: string) => partnerCompetenceApi.deletePartnerCompetence(partnerCompetenceId),
    onSuccess: () => {
      void invalidateCompetenceQueries(queryClient);
    },
  });
};
