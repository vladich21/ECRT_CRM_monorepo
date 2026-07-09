import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { dayjsToQuarterEnd, dayjsToQuarterStart } from './evaluationReportQuarterUtils';

/** Все даты диапазона включительно в формате YYYY-MM-DD. */
export function expandDateRange(start: Dayjs, end: Dayjs): string[] {
  const from = start.startOf('day');
  const to = end.startOf('day');
  if (from.isAfter(to)) return [];

  const dates: string[] = [];
  let current = from;
  while (!current.isAfter(to)) {
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  return dates;
}

export function resolveExcludedDates(excludedRange: [Dayjs | null, Dayjs | null] | null): string[] {
  if (!excludedRange?.[0] || !excludedRange?.[1]) return [];
  const start = dayjs(dayjsToQuarterStart(excludedRange[0]));
  const end = dayjs(dayjsToQuarterEnd(excludedRange[1]));
  return expandDateRange(start, end);
}
