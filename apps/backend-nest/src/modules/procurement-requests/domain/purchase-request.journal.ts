import type { IncomeLinkSnapshot } from '../procurement-requests.schema';

export function incomeLinksEqual(
  left: Pick<IncomeLinkSnapshot, 'income_contract_id' | 'income_stage_id'>,
  right: Pick<IncomeLinkSnapshot, 'income_contract_id' | 'income_stage_id'>,
): boolean {
  return left.income_contract_id === right.income_contract_id && left.income_stage_id === right.income_stage_id;
}

export function emptyIncomeLink(): IncomeLinkSnapshot {
  return {
    income_contract_id: null,
    income_stage_id: null,
    income_contract_name: null,
    income_stage_name: null,
  };
}
