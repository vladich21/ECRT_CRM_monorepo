import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { PartnerCompetence } from '../../types/partner';
import { partnerCompetenceApi } from './partnerCompetenceApi';

export const usePartnerCompetencies = (preview?: number): UseQueryResult<PartnerCompetence[], Error> => {
  return useQuery<PartnerCompetence[], Error>({
    queryKey: ['competencies'],
    queryFn: () => partnerCompetenceApi.getPartnerCompetencies(preview),
  });
};

export const usePartnerCompetenceById = (partnerCompetenceId: string): UseQueryResult<PartnerCompetence, Error> => {
  return useQuery<PartnerCompetence, Error>({
    queryKey: ['competencies', partnerCompetenceId],
    queryFn: () => partnerCompetenceApi.getPartnerCompetenceById(partnerCompetenceId),
    enabled: !!partnerCompetenceId,
  });
};

export const useCreatePartnerCompetence = (): UseMutationResult<PartnerCompetence, Error, PartnerCompetence> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerCompetence, Error, PartnerCompetence>({
    mutationFn: (data: PartnerCompetence) => partnerCompetenceApi.addPartnerCompetence(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'competencies');
        },
      });
    },
  });
};

export const useUpdatePartnerCompetence = (): UseMutationResult<
  PartnerCompetence,
  Error,
  { id: string; data: Partial<PartnerCompetence> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerCompetence, Error, { id: string; data: Partial<PartnerCompetence> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerCompetence> }) =>
      partnerCompetenceApi.editPartnerCompetence(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'competencies');
        },
      });
    },
  });
};

export const useDeletePartnerCompetence = (): UseMutationResult<PartnerCompetence, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerCompetence, Error, string>({
    mutationFn: (partnerCompetenceId: string) => partnerCompetenceApi.deletePartnerCompetence(partnerCompetenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'competencies');
        },
      });
    },
  });
};
