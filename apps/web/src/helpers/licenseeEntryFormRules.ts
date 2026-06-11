import type { Rule } from 'antd/es/form';

import type { LicenseeEntry } from '@/types/licenseeEntry';

import { innOptionalFormRules } from './innValidation';

export function isLicenseeFormRowEmpty(row: Partial<LicenseeEntry> | null | undefined): boolean {
  if (!row) return true;
  const name = String(row.name ?? '').trim();
  const inn = String(row.inn ?? '').trim();
  const partnerId = row.partner_id?.trim();
  return !name && !inn && !partnerId;
}

export const LICENSEE_NAME_REQUIRED_MESSAGE =
  'Укажите название или выберите контрагента из справочника';

export const LICENSEE_INN_ONLY_MESSAGE =
  'Нельзя указать только ИНН — укажите название или выберите контрагента из справочника';

export function buildLicenseeNameFormRules(listName: string, fieldIndex: number): Rule[] {
  return [
    ({ getFieldValue }) => ({
      validator(_: unknown, value: unknown) {
        const entries = getFieldValue(listName) as Partial<LicenseeEntry>[] | undefined;
        const row = entries?.[fieldIndex];
        if (isLicenseeFormRowEmpty(row)) return Promise.resolve();

        const name = String(value ?? '').trim();
        const partnerId = row?.partner_id?.trim();
        if (!name && !partnerId) {
          return Promise.reject(new Error(LICENSEE_NAME_REQUIRED_MESSAGE));
        }
        return Promise.resolve();
      },
    }),
  ];
}

export function buildLicenseeInnFormRules(listName: string, fieldIndex: number): Rule[] {
  return [
    ...innOptionalFormRules,
    ({ getFieldValue }) => ({
      validator(_: unknown, value: unknown) {
        const entries = getFieldValue(listName) as Partial<LicenseeEntry>[] | undefined;
        const row = entries?.[fieldIndex] ?? {};
        const inn = String(value ?? '').trim();
        const name = String(row.name ?? '').trim();
        const partnerId = row.partner_id?.trim();

        if (inn && !name && !partnerId) {
          return Promise.reject(new Error(LICENSEE_INN_ONLY_MESSAGE));
        }
        return Promise.resolve();
      },
    }),
  ];
}
