import type { FormInstance } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

import type {
  CreatePurchaseRequestPayload,
  PurchaseRequestDetail,
  UpdatePurchaseRequestPayload,
} from '@/api/procurement/requests/procurementRequestApi';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';

import type { PurchaseRequestDraftFormValues } from './PurchaseRequestDraftFields';

const FIELD_NAMES = [
  'subject',
  'justification',
  'required_date',
  'project_id',
  'department_id',
  'tech_acceptor_id',
  'funding_source',
  'income_contract_id',
  'income_stage_id',
] as const;

function readErrorFields(error: unknown): string[] {
  if (!axios.isAxiosError(error)) return [];
  const data = error.response?.data;
  if (!data || typeof data !== 'object') return [];
  const rec = data as { fields?: unknown; message?: unknown };
  if (Array.isArray(rec.fields)) return rec.fields.map(String);
  if (rec.message && typeof rec.message === 'object' && rec.message !== null && 'fields' in rec.message) {
    const nested = (rec.message as { fields?: unknown }).fields;
    if (Array.isArray(nested)) return nested.map(String);
  }
  return [];
}

export function applyPurchaseRequestFormErrors(form: FormInstance, error: unknown): string {
  const fields = readErrorFields(error).filter(name => (FIELD_NAMES as readonly string[]).includes(name));
  if (fields.length > 0) {
    form.setFields(fields.map(name => ({ name, errors: ['Проверьте поле'] })));
  }
  return getApiErrorMessage(error) ?? 'Не удалось сохранить запрос';
}

export function toDraftFormValues(detail: PurchaseRequestDetail): PurchaseRequestDraftFormValues {
  return {
    subject: detail.subject,
    justification: detail.justification,
    required_date: detail.required_date ? dayjs(detail.required_date) : null,
    project_id: detail.project_id,
    department_id: detail.department_id,
    tech_acceptor_id: detail.tech_acceptor_id,
    funding_source: detail.funding_source as PurchaseRequestDraftFormValues['funding_source'],
    is_urgent: detail.is_urgent,
    amount: detail.amount != null && detail.amount !== '' ? Number(detail.amount) : null,
    income_contract_id: detail.income_contract_id,
    income_stage_id: detail.income_stage_id,
  };
}

function fundingLink(values: PurchaseRequestDraftFormValues): {
  income_contract_id: string | null;
  income_stage_id: string | null;
} {
  if (values.funding_source !== 'income_contract') {
    return { income_contract_id: null, income_stage_id: null };
  }
  const income_contract_id = values.income_contract_id?.trim() || null;
  return {
    income_contract_id,
    income_stage_id: income_contract_id ? values.income_stage_id?.trim() || null : null,
  };
}

export function toCreatePayload(values: PurchaseRequestDraftFormValues): CreatePurchaseRequestPayload {
  return {
    subject: values.subject.trim(),
    justification: values.justification.trim(),
    required_date: values.required_date!.format('YYYY-MM-DD'),
    project_id: values.project_id,
    department_id: values.department_id,
    tech_acceptor_id: values.tech_acceptor_id,
    funding_source: values.funding_source,
    is_urgent: Boolean(values.is_urgent),
    ...(values.amount != null && values.amount > 0 ? { amount: values.amount } : {}),
    ...fundingLink(values),
  };
}

export function toUpdatePayload(
  values: PurchaseRequestDraftFormValues,
  detail: PurchaseRequestDetail,
  writable?: ReadonlySet<string>,
): UpdatePurchaseRequestPayload {
  const next = toCreatePayload(values);
  const previous = toCreatePayload(toDraftFormValues(detail));
  const payload: UpdatePurchaseRequestPayload = { updated_at: detail.updated_at };

  const canWrite = (field: string) => !writable || writable.has(field);

  if (canWrite('subject') && next.subject !== previous.subject) payload.subject = next.subject;
  if (canWrite('justification') && next.justification !== previous.justification) {
    payload.justification = next.justification;
  }
  if (canWrite('required_date') && next.required_date !== previous.required_date) {
    payload.required_date = next.required_date;
  }
  if (canWrite('project_id') && next.project_id !== previous.project_id) payload.project_id = next.project_id;
  if (canWrite('department_id') && next.department_id !== previous.department_id) {
    payload.department_id = next.department_id;
  }
  if (canWrite('tech_acceptor_id') && next.tech_acceptor_id !== previous.tech_acceptor_id) {
    payload.tech_acceptor_id = next.tech_acceptor_id;
  }
  if (canWrite('funding_source') && next.funding_source !== previous.funding_source) {
    payload.funding_source = next.funding_source;
  }
  if (canWrite('is_urgent') && Boolean(next.is_urgent) !== Boolean(previous.is_urgent)) {
    payload.is_urgent = Boolean(next.is_urgent);
  }

  const nextAmount = next.amount ?? null;
  const previousAmount = previous.amount ?? null;
  if (canWrite('amount') && nextAmount !== previousAmount) payload.amount = nextAmount;

  if (
    canWrite('income_contract_id') &&
    (next.income_contract_id !== previous.income_contract_id || next.income_stage_id !== previous.income_stage_id)
  ) {
    payload.income_contract_id = next.income_contract_id ?? null;
    payload.income_stage_id = next.income_stage_id ?? null;
  }

  return payload;
}
