import dayjs from 'dayjs';

import type { Contract, ContractRevision, ContractStage } from '../../../types/contract';

export function mapContractToRevisionInitialValues(contract: Contract): Record<string, unknown> {
  return {
    name: contract.name ?? '',
    number: contract.number ?? '',
    cipher: contract.cipher ?? '',
    description: contract.description ?? '',
    partner_id: contract.partner_id,
    project_id: contract.project_id,
    responsible_id: contract.responsible_id,
    category_id: contract.category_id,
    contract_type_id: contract.contract_type_id,
    amount_excl_vat: contract.amount_excl_vat,
    vat_rate: contract.vat_rate,
    amount_vat: contract.amount_vat,
    amount_incl_vat: contract.amount_incl_vat,
    start_date: contract.start_date ? dayjs(contract.start_date) : null,
    end_date: contract.end_date ? dayjs(contract.end_date) : null,
    date_signed: contract.date_signed ? dayjs(contract.date_signed) : null,
    state_id: contract.state_id,
    is_active: contract.is_active,
    comment: '',
    revision_reason: '',
  };
}

export function buildRevisionPayload(
  values: Record<string, unknown>,
  stages: ContractStage[],
  contract: Contract,
): Omit<ContractRevision, 'contract_id' | 'revision_number'> {
  return {
    ...values,
    contract_type_id: (values.contract_type_id as string) || contract.contract_type_id,
    stages,
  } as Omit<ContractRevision, 'contract_id' | 'revision_number'>;
}
