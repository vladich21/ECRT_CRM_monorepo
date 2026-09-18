/** Общее для запросов реестра: сброс всего кэша. */

import { useQueryClient } from '@tanstack/react-query';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';

export function useInvalidateSwRegistry() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
}
