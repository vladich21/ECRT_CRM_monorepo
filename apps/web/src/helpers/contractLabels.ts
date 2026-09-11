import type { Contract } from '@/types/contract';

export function formatIncomeContractLabel(contract: Pick<Contract, 'number' | 'name' | 'is_active'>): string {
  const base = contract.number?.trim() || contract.name?.trim() || 'Без номера';
  return contract.is_active === false ? `${base} (закрыт)` : base;
}

export function toIncomeContractSelectOptions(contracts: Contract[]) {
  return contracts.map(row => ({
    value: row.id,
    label: formatIncomeContractLabel(row),
  }));
}
