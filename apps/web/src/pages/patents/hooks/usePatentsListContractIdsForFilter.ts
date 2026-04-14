import { useMemo } from 'react';

export function usePatentsListContractIdsForFilter(
  patentLinkedContractIds: string[],
  appliedContractId: string | null,
  draftContractId: string | null,
): string[] {
  return useMemo(() => {
    const ids = new Set(patentLinkedContractIds);
    if (appliedContractId) ids.add(appliedContractId);
    if (draftContractId) ids.add(draftContractId);
    return Array.from(ids);
  }, [patentLinkedContractIds, appliedContractId, draftContractId]);
}
