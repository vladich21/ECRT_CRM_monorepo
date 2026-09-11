import type { FundingSource } from './purchase-request.enums';

export type FundingLink = {
  incomeContractId: string | null;
  incomeStageId: string | null;
};

export function resolveFundingLink(
  source: FundingSource,
  contractId?: string | null,
  stageId?: string | null,
): FundingLink {
  if (source !== 'income_contract') {
    return { incomeContractId: null, incomeStageId: null };
  }
  const incomeContractId = emptyToNull(contractId);
  const incomeStageId = incomeContractId ? emptyToNull(stageId) : null;
  return { incomeContractId, incomeStageId };
}

export function needsIncomeContractForApprove(
  fundingSource: string,
  incomeContractId: string | null | undefined,
): boolean {
  return fundingSource === 'income_contract' && !incomeContractId;
}

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
