import type { Contract } from '@/types/contract';
import { detailHeaderVariantForContractHeader } from '@/components/pageLayout/DetailPageHeader';
import { formatContractDetailPageHeading } from '@/pages/contracts/utils/contractDetailsUtils';

export function buildContractDetailsTitle(contract: Contract): string {
  return formatContractDetailPageHeading(contract);
}

export function buildContractDetailsStatusBadge(contract: Contract) {
  return {
    label: contract.is_deleted ? 'Удалён' : contract.is_active ? 'Действует' : 'Не действует',
    variant: detailHeaderVariantForContractHeader(!!contract.is_deleted, !!contract.is_active),
  };
}

export function buildContractDetailsBackLabel(from: string | undefined): string {
  if (typeof from === 'string' && from.includes('/partners/') && from.includes('/contracts')) {
    return 'К договорам контрагента';
  }
  if (typeof from === 'string' && from.startsWith('/patents/')) {
    return 'К РИД';
  }
  return 'Договоры';
}
