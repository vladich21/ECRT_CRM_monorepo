/** Запросы справочников реестра. */

import { useQuery } from '@tanstack/react-query';
import { swReferencesApi } from './references';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';

export function useSwReferences(kind: string) {
  return useQuery({
    queryKey: swRegistryQueryKeys.references(kind),
    queryFn: () => swReferencesApi.getReferences(kind),
    // Справочники меняются редко, а от них зависит разметка комплекта: без кэша
    // каждое открытие программы ждало их заново.
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}
