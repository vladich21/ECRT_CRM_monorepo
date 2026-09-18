import { useQuery } from '@tanstack/react-query';

import { partnerApi } from '@/api/partners/partnerApi';

/** Короткое имя как в селекте создания программы, не полное юрлицо. */
export function usePartnerShortName(partnerId: string, fallback = ''): string {
  const query = useQuery({
    queryKey: ['partners', 'short-name', partnerId],
    queryFn: () => partnerApi.getPartnerById(partnerId),
    enabled: Boolean(partnerId),
    staleTime: 5 * 60_000,
  });
  const row = query.data;
  return (row?.short_name || row?.name || fallback).trim();
}
