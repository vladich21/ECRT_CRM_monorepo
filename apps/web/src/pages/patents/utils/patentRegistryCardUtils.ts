import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import type { Patent } from '@/types/patent';

import { formatContractSignedDateRu } from '@/pages/contracts/utils/contractDetailsUtils';

export type PatentRegistryHeadingFields = {
  registration_number?: string | null;
  registration_date?: string | Dayjs | null;
  name?: string | null;
};

function registrationDateToIso(value: string | Dayjs | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : null;
  }
  const s = String(value).trim();
  return s || null;
}

export function formatPatentRegistryCardHeading(patent: PatentRegistryHeadingFields): string {
  const num = (patent.registration_number ?? '').trim() || '—';
  const iso = registrationDateToIso(patent.registration_date ?? null);
  const date = formatContractSignedDateRu(iso);
  const name = (patent.name ?? '').trim();
  let heading = `№ ${num}`;
  if (date) heading += ` от ${date}`;
  if (name) heading += ` "${name}"`;
  return heading;
}
