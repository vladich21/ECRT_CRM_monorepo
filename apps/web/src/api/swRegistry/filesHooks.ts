/** Запросы файлов записей реестра. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { swFilesApi } from './files';
import type {
  SwFileObjectType,
} from '@/types/swRegistry';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';

export function useSwFiles(objectType: SwFileObjectType, objectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: swRegistryQueryKeys.files(objectType, objectId ?? ''),
    queryFn: () => swFilesApi.listFiles(objectType, objectId!),
    enabled: Boolean(objectId) && enabled,
  });
}

export function useDetachSwFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId }: { linkId: string; objectType: string; objectId: string }) =>
      swFilesApi.detachSwFile(linkId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: swRegistryQueryKeys.files(variables.objectType, variables.objectId),
      });
    },
  });
}
