import type { FormInstance } from 'antd/es/form/Form';
import dayjs from 'dayjs';

import type { CreateContractPayload } from '../../../api/contracts/contractApi';

type ContractStateOption = { id: string; name: string; code?: string | null };

export function findDraftContractStateId(contractStates: ContractStateOption[] | undefined): string | undefined {
  const draft = contractStates?.find(
    state => state.code === 'draft' || state.name.toLowerCase().includes('чернов'),
  );
  return draft?.id;
}

export function applyVatDerivedAmounts(form: FormInstance, amountExcl: number, vatRatePercent: number): void {
  const amountVat = amountExcl * (vatRatePercent / 100);
  const amountInclVat = amountExcl + amountVat;
  form.setFieldsValue({
    amount_vat: Math.round(amountVat * 100) / 100,
    amount_incl_vat: Math.round(amountInclVat * 100) / 100,
  });
}

export function buildCreateContractPayload(formValues: Record<string, unknown>): CreateContractPayload {
  const trimOrNull = (raw: unknown) => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const numOrNull = (raw: unknown) => {
    if (raw === '' || raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const dateOrNull = (raw: unknown) => {
    if (raw == null) return null;
    return dayjs.isDayjs(raw) ? raw.format('YYYY-MM-DD') : null;
  };

  const idOrNull = (raw: unknown) => {
    if (raw == null || raw === '') return null;
    return String(raw);
  };

  const boolField = (raw: unknown): boolean | undefined =>
    typeof raw === 'boolean' ? raw : undefined;

  return {
    number: trimOrNull(formValues.number),
    cipher: trimOrNull(formValues.cipher),
    name: trimOrNull(formValues.name),
    description: trimOrNull(formValues.description),
    partner_id: idOrNull(formValues.partner_id),
    responsible_id: idOrNull(formValues.responsible_id),
    project_id: idOrNull(formValues.project_id),
    contract_type_id: idOrNull(formValues.contract_type_id),
    category_id: idOrNull(formValues.category_id),
    date_signed: dateOrNull(formValues.date_signed),
    start_date: dateOrNull(formValues.start_date),
    end_date: dateOrNull(formValues.end_date),
    amount_excl_vat: numOrNull(formValues.amount_excl_vat),
    vat_rate: numOrNull(formValues.vat_rate) ?? 22,
    amount_vat: numOrNull(formValues.amount_vat),
    amount_incl_vat: numOrNull(formValues.amount_incl_vat),
    state_id: idOrNull(formValues.state_id),
    is_active: boolField(formValues.is_active),
  };
}
