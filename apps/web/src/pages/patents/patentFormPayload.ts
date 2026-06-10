import dayjs from 'dayjs';

import { PATENT_DEFAULT_RID_VAT_RATE } from '@/pages/patents/utils/patentRidCostUtils';

function numOrNull(raw: unknown): number | null {
  if (raw === '' || raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPatentFormPayload(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const areaIds = Array.isArray(values.area_ids)
    ? values.area_ids.map((id: unknown) => (id != null ? String(id) : '')).filter((id: string) => id && id !== 'NaN')
    : [];
  const authorIds = Array.isArray(values.author_ids)
    ? values.author_ids.filter((id: unknown) => id != null)
    : [];

  const registration_date = values.registration_date;
  const registration_date_cir = values.registration_date_cir;

  const payload: Record<string, unknown> = {
    ...values,
    registration_date: dayjs.isDayjs(registration_date) ? registration_date.format('YYYY-MM-DD') : null,
    registration_date_cir: dayjs.isDayjs(registration_date_cir) ? registration_date_cir.format('YYYY-MM-DD') : null,
    department_id: values.department_id || null,
    responsible_for_patenting_id: values.responsible_for_patenting_id || null,
    contract_id: values.contract_id || null,
    expected_licensee_partner_ids: Array.isArray(values.expected_licensee_partner_ids)
      ? values.expected_licensee_partner_ids.filter((id: unknown) => id != null && String(id).trim())
      : [],
    rid_cost_excl_vat: numOrNull(values.rid_cost_excl_vat),
    rid_vat_rate: numOrNull(values.rid_vat_rate) ?? PATENT_DEFAULT_RID_VAT_RATE,
    rid_cost_vat: numOrNull(values.rid_cost_vat),
    rid_cost_incl_vat: numOrNull(values.rid_cost_incl_vat),
    project_id: values.project_id || null,
    intellectprop_id: values.intellectprop_id || null,
    area_ids: areaIds,
    author_ids: authorIds,
  };
  delete payload['project_code'];

  delete payload.status_id;

  return payload;
}
