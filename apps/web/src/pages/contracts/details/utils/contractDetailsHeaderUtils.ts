import type { Contract } from '@/types/contract';
import { detailHeaderVariantForContractHeader } from '@/components/pageLayout/DetailPageHeader';
import { getInternalReturnBackLabel } from '@/helpers/internalReturnNavigation';
import { formatContractDetailPageHeading } from '@/pages/contracts/utils/contractDetailsUtils';

export function buildContractDetailsTitle(contract: Contract): string {
  return formatContractDetailPageHeading(contract);
}

export function buildContractDetailsStatusBadge(contract: Contract) {
  return {
    label: contract.is_deleted ? 'Удален' : contract.is_active ? 'Действует' : 'Не действует',
    variant: detailHeaderVariantForContractHeader(!!contract.is_deleted, !!contract.is_active),
  };
}

export function buildContractDetailsBackLabel(from: string | undefined): string {
  if (typeof from === 'string' && from.trim()) {
    return getInternalReturnBackLabel(from.trim(), 'Договоры');
  }
  return 'Договоры';
}
