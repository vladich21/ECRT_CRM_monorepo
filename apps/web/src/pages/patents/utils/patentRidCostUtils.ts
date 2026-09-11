import type { FormInstance } from 'antd/es/form/Form';

import { formatRub } from '@/helpers/numberFormatters';

export const PATENT_DEFAULT_RID_VAT_RATE = 22;

export function applyPatentRidVatAmounts(
  form: FormInstance,
  amountExcl: number,
  vatRatePercent: number,
): void {
  const amountVat = amountExcl * (vatRatePercent / 100);
  const amountInclVat = amountExcl + amountVat;
  form.setFieldsValue({
    rid_cost_vat: Math.round(amountVat * 100) / 100,
    rid_cost_incl_vat: Math.round(amountInclVat * 100) / 100,
  });
}

export const formatPatentMoney = formatRub;

export function calcPatentRidVatAmount(
  amountExcl: number | null | undefined,
  vatRate: number | null | undefined,
  amountIncl: number | null | undefined,
): number {
  const rate = Number(vatRate) || 0;
  if (rate <= 0) return 0;
  const excl = Number(amountExcl) || 0;
  if (excl > 0) return Math.round(excl * (rate / 100) * 100) / 100;
  const incl = Number(amountIncl) || 0;
  if (incl > 0) return Math.round((incl - incl / (1 + rate / 100)) * 100) / 100;
  return 0;
}
