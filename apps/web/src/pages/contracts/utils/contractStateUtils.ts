import { ContractState } from '../../../types/contract';

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

export function getContractStateTagClass(code: string | undefined): string {
  if (!code) return 'tagStateDefault';
  const codeUpper = code.toUpperCase();
  if (codeUpper === 'DRAFT') return 'tagStateDraft';
  if (codeUpper === 'ON_APPROVAL') return 'tagStateOnApproval';
  if (codeUpper === 'APPROVED' || codeUpper === 'SIGNED') return 'tagStateSigned';
  if (codeUpper === 'REJECTED') return 'tagStateRejected';
  if (codeUpper === 'CLOZED' || codeUpper === 'CLOSED') return 'tagStateClosed';
  return 'tagStateDefault';
}
