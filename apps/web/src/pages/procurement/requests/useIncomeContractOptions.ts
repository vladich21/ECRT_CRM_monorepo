import { useMemo } from 'react';

import { useContractById } from '@/api/contracts/contractApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';

import { pickIncomeContracts, withSelectedContract } from './incomeContracts';

export function useIncomeContractOptions(selectedId?: string | null) {
  const { data: references, isLoading, isError } = useReferenceData(['contracts', 'contractTypes'], {
    contractsIncludeInactive: true,
  });
  const all = references?.contracts;
  const types = references?.contractTypes;
  const picked = useMemo(() => pickIncomeContracts(all ?? [], types ?? []), [all, types]);
  const fromCatalog = selectedId ? (all?.find(row => row.id === selectedId) ?? null) : null;
  const { data: fetched } = useContractById(!fromCatalog && selectedId ? selectedId : '');
  const contracts = useMemo(
    () => withSelectedContract(picked, selectedId, fromCatalog ?? fetched ?? null),
    [picked, selectedId, fromCatalog, fetched],
  );

  return { contracts, isLoading, isError };
}
