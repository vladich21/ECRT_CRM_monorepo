import { ContractState } from '../../../types/contract';

/** Договор в статусе черновик — удалять нельзя */
export function isContractDraft(
  stateId: string | undefined,
  contractStates: ContractState[] | undefined
): boolean {
  if (!stateId || !contractStates?.length) return false;
  const state = contractStates.find(s => s.id === stateId);
  if (!state) return false;
  const code = state.code?.toLowerCase();
  const name = (state.name ?? '').toLowerCase();
  return code === 'draft' || name.includes('чернов');
}
