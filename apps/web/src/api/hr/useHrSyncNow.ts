import { useMutation, useQueryClient } from '@tanstack/react-query';

import { refreshSessionUser } from '../auth/refreshSessionUser';
import { hrSyncApi } from './hrSyncApi';
import { userQueryKeys } from '../users/userQueryKeys';

export function useHrSyncNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => hrSyncApi.syncUsersNow(),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['reference-data'] });
      try {
        await refreshSessionUser();
      } catch {
      }
    },
  });
}
