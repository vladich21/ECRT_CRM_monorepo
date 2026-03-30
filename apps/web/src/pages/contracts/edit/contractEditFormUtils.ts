import dayjs from 'dayjs';

import type { Contract } from '../../../types/contract';

export function applyDayjsDateFieldsToPayload(payload: Record<string, unknown>): Partial<Contract> {
  const out: Record<string, unknown> = { ...payload };
  for (const key of ['date_signed', 'start_date', 'end_date'] as const) {
    const value = out[key];
    if (value != null && dayjs.isDayjs(value)) {
      out[key] = value.format('YYYY-MM-DD');
    }
  }
  return out as Partial<Contract>;
}
