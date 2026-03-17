import type { Contract } from '../../../types/contract';
import type { ContractState } from '../../../types/contract';
import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';
import type { ContractListReferences } from '../list/ContractsListPage.types';
import { isContractDraft } from '../utils/contractStateUtils';

export function filterByTab(
  contracts: Contract[],
  tab: FilterTab,
  contractStates: ContractState[] | undefined
): Contract[] {
  switch (tab) {
    case 'active':
      return contracts.filter((contract) => contract.is_active);
    case 'inactive':
      return contracts.filter((contract) => !contract.is_active);
    case 'draft':
      return contracts.filter((contract) =>
        isContractDraft(contract.state_id, contractStates)
      );
    default:
      return contracts;
  }
}

export function filterByAdvanced(
  contracts: Contract[],
  filters: AdvancedFilters
): Contract[] {
  let result = contracts;

  if (filters.partnerId != null) {
    result = result.filter((contract) => contract.partner_id === filters.partnerId);
  }
  if (filters.categoryId != null) {
    result = result.filter((contract) => contract.category_id === filters.categoryId);
  }
  if (filters.stateId != null) {
    result = result.filter((contract) => contract.state_id === filters.stateId);
  }
  if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
    const [fromDate, toDate] = [
      filters.dateRange[0].format('YYYY-MM-DD'),
      filters.dateRange[1].format('YYYY-MM-DD'),
    ];
    result = result.filter(
      (contract) =>
        (contract.start_date || '') <= toDate &&
        (contract.end_date || contract.start_date || '') >= fromDate
    );
  }
  if (filters.amountMin != null) {
    result = result.filter(
      (contract) => (contract.amount_incl_vat ?? 0) >= filters.amountMin!
    );
  }
  if (filters.amountMax != null) {
    result = result.filter(
      (contract) => (contract.amount_incl_vat ?? 0) <= filters.amountMax!
    );
  }

  return result;
}

export function filterBySearch(
  contracts: Contract[],
  searchQuery: string,
  references: ContractListReferences
): Contract[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return contracts;

  return contracts.filter((contract) => {
    const partnerName =
      references?.partners?.find((partner) => partner.id === contract.partner_id)
        ?.name ?? '';
    return (
      contract.number?.toLowerCase().includes(normalizedQuery) ||
      contract.cipher?.toLowerCase().includes(normalizedQuery) ||
      contract.name?.toLowerCase().includes(normalizedQuery) ||
      partnerName.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function countActiveFilters(filters: AdvancedFilters): number {
  const hasPartner = filters.partnerId != null;
  const hasCategory = filters.categoryId != null;
  const hasState = filters.stateId != null;
  const hasDateRange =
    filters.dateRange?.[0] != null && filters.dateRange?.[1] != null;
  const hasAmount =
    filters.amountMin != null || filters.amountMax != null;

  return [hasPartner, hasCategory, hasState, hasDateRange, hasAmount].filter(
    Boolean
  ).length;
}
