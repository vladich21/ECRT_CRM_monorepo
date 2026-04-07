import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { isValidUuid } from '../../helpers/isValidUuid';
import { PartnerContact } from '../../types/partner';
import { partnerContactApi } from './partnerContactApi';
import { partnerQueryKeys } from './partnerQueryKeys';

export const usePartnerContacts = (partnerId?: string): UseQueryResult<PartnerContact[], Error> => {
  return useQuery<PartnerContact[], Error>({
    queryKey: partnerQueryKeys.contacts(partnerId),
    queryFn: () => partnerContactApi.getPartnerContacts(partnerId),
    enabled: isValidUuid(partnerId),
  });
};

export const useCreatePartnerContact = (): UseMutationResult<
  PartnerContact,
  Error,
  { partnerId: string; data: PartnerContact }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerContact, Error, { partnerId: string; data: PartnerContact }>({
    mutationFn: ({ partnerId, data }) => partnerContactApi.addPartnerContact(partnerId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: partnerQueryKeys.contacts(variables.partnerId),
      });
    },
  });
};

export const useUpdatePartnerContact = (): UseMutationResult<
  PartnerContact,
  Error,
  { partnerId: string; contactId: string; data: Partial<PartnerContact> }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerContact, Error, { partnerId: string; contactId: string; data: Partial<PartnerContact> }>({
    mutationFn: ({ partnerId, contactId, data }) => partnerContactApi.editPartnerContact(partnerId, contactId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: partnerQueryKeys.contacts(variables.partnerId),
      });
    },
  });
};

export const useDeletePartnerContact = (): UseMutationResult<
  PartnerContact,
  Error,
  { partnerId: string; contactId: string }
> => {
  const queryClient = useQueryClient();

  return useMutation<PartnerContact, Error, { partnerId: string; contactId: string }>({
    mutationFn: ({ partnerId, contactId }) => partnerContactApi.deletePartnerContact(partnerId, contactId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: partnerQueryKeys.contacts(variables.partnerId),
      });
    },
  });
};
