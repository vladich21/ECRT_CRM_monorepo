import dayjs, { type Dayjs } from 'dayjs';

import { quarterLabel } from './partnerEvaluationReportModel';
import { formatEvaluatedAtRu } from './supplierEvaluationUi';

export function dayjsToQuarterStart(value: Dayjs): string {
  const month = value.month() + 1;
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return dayjs(`${value.year()}-${String(quarterStartMonth).padStart(2, '0')}-01`).format('YYYY-MM-DD');
}

export function dayjsToQuarterEnd(value: Dayjs): string {
  const month = value.month() + 1;
  const quarterEndMonth = Math.floor((month - 1) / 3) * 3 + 3;
  return dayjs(`${value.year()}-${String(quarterEndMonth).padStart(2, '0')}-01`)
    .endOf('month')
    .format('YYYY-MM-DD');
}

export function quarterRangeToDateBounds(
  range: [Dayjs | null, Dayjs | null] | null,
): { dateFrom: string | null; dateTo: string | null } {
  if (!range) return { dateFrom: null, dateTo: null };
  return {
    dateFrom: range[0] ? dayjsToQuarterStart(range[0]) : null,
    dateTo: range[1] ? dayjsToQuarterEnd(range[1]) : null,
  };
}

export function formatQuarterPickerValue(value: Dayjs | null): string {
  if (!value) return '';
  return quarterLabel(value.format('YYYY-MM-DD'));
}

export function formatEvaluatedAtWithQuarter(iso: string): string {
  return `${formatEvaluatedAtRu(iso)} (${quarterLabel(iso)})`;
}

export function isQuarterBeforeBounds(
  quarterValue: Dayjs,
  bounds: { min: Dayjs | null; max: Dayjs },
): boolean {
  const quarterEnd = dayjs(dayjsToQuarterEnd(quarterValue));
  return bounds.min ? quarterEnd.isBefore(bounds.min, 'day') : false;
}

export function isQuarterAfterBounds(
  quarterValue: Dayjs,
  bounds: { min: Dayjs | null; max: Dayjs },
): boolean {
  const quarterStart = dayjs(dayjsToQuarterStart(quarterValue));
  return quarterStart.isAfter(bounds.max, 'day');
}
