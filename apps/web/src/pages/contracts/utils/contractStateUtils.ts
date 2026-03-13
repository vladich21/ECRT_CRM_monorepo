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

/** Класс тега состояния договора для списка (совпадает с именами в ContractsListPage.module.scss) */
export function getContractStateTagClass(code: string | undefined): string {
  if (!code) return 'tagStateDefault';
  const c = code.toUpperCase();
  if (c === 'DRAFT') return 'tagStateDraft';
  if (c === 'ON_APPROVAL') return 'tagStateOnApproval';
  if (c === 'APPROVED' || c === 'SIGNED') return 'tagStateSigned';
  if (c === 'REJECTED') return 'tagStateRejected';
  if (c === 'CLOZED' || c === 'CLOSED') return 'tagStateClosed';
  return 'tagStateDefault';
}
