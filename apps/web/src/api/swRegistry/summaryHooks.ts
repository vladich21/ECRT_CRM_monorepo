/** Запрос свода. */

import { useQuery } from '@tanstack/react-query';
import { swSummaryApi } from './summary';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';

export function useSwSummary(params: {
  by?: string;
  elementId?: string;
  developmentKind?: string;
  partnerId?: string;
}) {
  return useQuery({
    queryKey: swRegistryQueryKeys.summary(params),
    queryFn: () => swSummaryApi.getSummary(params),
  });
}
