import type { FundingSource } from './purchase-request.enums';

export type PurchaseRequestPatchSnapshot = {
  subject: string;
  justification: string;
  requiredDate: string;
  projectId: string;
  departmentId: string;
  techAcceptorId: string;
  fundingSource: string | null;
  expertPrice: string | null;
  amount: string | null;
  currencyCode: string;
  vatRateId: string | null;
  vatIncluded: boolean;
  isUrgent: boolean;
  incomeContractId: string | null;
  incomeStageId: string | null;
};

export type PurchaseRequestPatchInput = {
  subject?: string;
  justification?: string;
  required_date?: string;
  project_id?: string;
  department_id?: string;
  tech_acceptor_id?: string;
  funding_source?: FundingSource;
  expert_price?: number | null;
  amount?: number | null;
  currency_code?: string;
  vat_rate_id?: string | null;
  vat_included?: boolean;
  is_urgent?: boolean;
  income_contract_id?: string | null;
  income_stage_id?: string | null;
};

/** Поля, значение которых реально сменилось. Ключ в PATCH ? изменение. */
export function changedRequisiteFields(
  existing: PurchaseRequestPatchSnapshot,
  dto: PurchaseRequestPatchInput,
): string[] {
  const changed: string[] = [];
  if (dto.subject !== undefined && dto.subject.trim() !== existing.subject) changed.push('subject');
  if (dto.justification !== undefined && dto.justification.trim() !== existing.justification) {
    changed.push('justification');
  }
  if (dto.required_date !== undefined && dto.required_date.trim() !== existing.requiredDate) {
    changed.push('required_date');
  }
  if (dto.project_id !== undefined && dto.project_id !== existing.projectId) changed.push('project_id');
  if (dto.department_id !== undefined && dto.department_id !== existing.departmentId) {
    changed.push('department_id');
  }
  if (dto.tech_acceptor_id !== undefined && dto.tech_acceptor_id !== existing.techAcceptorId) {
    changed.push('tech_acceptor_id');
  }
  if (dto.funding_source !== undefined && dto.funding_source !== existing.fundingSource) {
    changed.push('funding_source');
  }
  if (dto.expert_price !== undefined && !sameMoney(existing.expertPrice, dto.expert_price)) {
    changed.push('expert_price');
  }
  if (dto.amount !== undefined && !sameMoney(existing.amount, dto.amount)) changed.push('amount');
  if (dto.currency_code !== undefined && dto.currency_code.trim() !== existing.currencyCode) {
    changed.push('currency_code');
  }
  if (dto.vat_rate_id !== undefined && dto.vat_rate_id !== existing.vatRateId) changed.push('vat_rate_id');
  if (dto.vat_included !== undefined && dto.vat_included !== existing.vatIncluded) changed.push('vat_included');
  if (dto.is_urgent !== undefined && dto.is_urgent !== existing.isUrgent) changed.push('is_urgent');
  return changed;
}

function sameMoney(stored: string | null, incoming: number | null): boolean {
  const next = incoming == null ? null : incoming;
  const prev = stored == null || stored === '' ? null : Number(stored);
  if (prev == null && next == null) return true;
  if (prev == null || next == null) return false;
  return prev === next;
}
