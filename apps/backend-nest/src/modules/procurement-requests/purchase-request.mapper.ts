import { alias } from 'drizzle-orm/pg-core';

import { departments, projects, users } from '../../database/schema';
import { purchaseRequests, type NmcdSnapshot } from './procurement-requests.schema';

export const purchaseRequestInitiator = alias(users, 'pr_initiator');
export const purchaseRequestLead = alias(users, 'pr_lead');
export const purchaseRequestTechAcceptor = alias(users, 'pr_tech_acceptor');

export function formatPersonName(
  lastName: string | null,
  firstName: string | null,
  middleName?: string | null,
): string | null {
  const parts = [lastName, firstName, middleName].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? parts.join(' ') : null;
}

export type PurchaseRequestListRow = {
  id: string;
  number: number;
  request_date: string;
  status: string;
  subject: string;
  project_id: string;
  project_name: string | null;
  amount: string | null;
  currency_code: string;
  is_urgent: boolean;
  initiator_id: string;
  initiator_name: string | null;
  lead_manager_id: string | null;
  lead_manager_name: string | null;
  updated_at: string;
};

type ListSource = {
  id: string;
  number: number;
  requestDate: string;
  status: string;
  subject: string;
  projectId: string;
  projectName: string | null;
  amount: string | null;
  currencyCode: string;
  isUrgent: boolean;
  initiatorId: string;
  initiatorLastName: string | null;
  initiatorFirstName: string | null;
  leadManagerId: string | null;
  leadLastName: string | null;
  leadFirstName: string | null;
  updatedAt: Date | string;
};

export function toIsoSafe(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export function toListRow(row: ListSource): PurchaseRequestListRow {
  return {
    id: row.id,
    number: row.number,
    request_date: row.requestDate,
    status: row.status,
    subject: row.subject,
    project_id: row.projectId,
    project_name: row.projectName,
    amount: row.amount,
    currency_code: row.currencyCode,
    is_urgent: row.isUrgent,
    initiator_id: row.initiatorId,
    initiator_name: formatPersonName(row.initiatorLastName, row.initiatorFirstName),
    lead_manager_id: row.leadManagerId,
    lead_manager_name: formatPersonName(row.leadLastName, row.leadFirstName),
    updated_at: toIsoSafe(row.updatedAt),
  };
}

export const purchaseRequestListSelect = {
  id: purchaseRequests.id,
  number: purchaseRequests.number,
  requestDate: purchaseRequests.requestDate,
  status: purchaseRequests.status,
  subject: purchaseRequests.subject,
  projectId: purchaseRequests.projectId,
  projectName: projects.name,
  amount: purchaseRequests.amount,
  currencyCode: purchaseRequests.currencyCode,
  isUrgent: purchaseRequests.isUrgent,
  initiatorId: purchaseRequests.initiatorId,
  initiatorLastName: purchaseRequestInitiator.lastName,
  initiatorFirstName: purchaseRequestInitiator.firstName,
  leadManagerId: purchaseRequests.leadManagerId,
  leadLastName: purchaseRequestLead.lastName,
  leadFirstName: purchaseRequestLead.firstName,
  updatedAt: purchaseRequests.updatedAt,
};

export type PurchaseRequestDetail = PurchaseRequestListRow & {
  justification: string;
  required_date: string;
  department_id: string;
  department_name: string | null;
  tech_acceptor_id: string;
  tech_acceptor_name: string | null;
  funding_source: string | null;
  income_contract_id: string | null;
  income_contract_name: string | null;
  income_stage_id: string | null;
  income_stage_name: string | null;
  expert_price: string | null;
  vat_rate_id: string | null;
  vat_included: boolean;
  price_method: string | null;
  price_method_note: string | null;
  initial_max_price: string | null;
  nmcd_snapshot: NmcdSnapshot | null;
  selected_quote_id: string | null;
  selection_note: string | null;
  purchase_method_id: string | null;
  purchase_method_code: string | null;
  purchase_method_name: string | null;
  method_justification: string | null;
  routed_contract_id: string | null;
  suggested_lead_manager_id: string | null;
};

export function formatContractTitle(number: string | null | undefined, name: string | null | undefined): string | null {
  const n = number?.trim();
  const nm = name?.trim();
  if (n && nm) return `${n} — ${nm}`;
  return n || nm || null;
}

export { purchaseRequests, projects, departments };
