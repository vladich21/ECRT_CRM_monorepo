import { ContractState } from '@/types/contract';

export function isContractDraft(stateId: string | undefined, contractStates: ContractState[] | undefined): boolean {
  if (!stateId || !contractStates?.length) return false;
  const contractState = contractStates.find(state => state.id === stateId);
  if (!contractState) return false;
  const stateCode = contractState.code?.toLowerCase();
  const stateName = (contractState.name ?? '').toLowerCase();
  return stateCode === 'draft' || stateName.includes('чернов');
}

export function isContractSignedState(
  stateId: string | undefined,
  contractStates: ContractState[] | undefined,
): boolean {
  if (!stateId || !contractStates?.length) return false;
  const contractState = contractStates.find(state => state.id === stateId);
  if (!contractState) return false;
  const stateCode = contractState.code?.toLowerCase();
  const stateName = (contractState.name ?? '').toLowerCase();
  return stateCode === 'signed' || stateName.includes('подписан');
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
