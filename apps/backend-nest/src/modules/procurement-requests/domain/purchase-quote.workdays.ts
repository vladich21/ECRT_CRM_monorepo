import { QUOTE_EXPIRING_WORKING_DAYS } from './purchase-quote.enums';

const MSK_OFFSET_HOURS = 3;

export function moscowDateIso(now = new Date()): string {
  return new Date(now.getTime() + MSK_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

function parseIsoDateUtc(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function isWeekendUtc(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Рабочие дни пн–пт от from до to включительно.
 * Праздники — ПрИ-4, в закупках производственного календаря ещё нет; не подменяем +5 календарных.
 */
export function remainingWorkingDays(fromIso: string, toIso: string): number {
  if (toIso < fromIso) return 0;
  let count = 0;
  const current = parseIsoDateUtc(fromIso);
  const endMs = parseIsoDateUtc(toIso).getTime();
  while (current.getTime() <= endMs) {
    if (!isWeekendUtc(current)) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

export function isQuoteExpiring(validUntil: string | null, todayIso: string): boolean {
  if (!validUntil) return false;
  if (validUntil < todayIso) return true;
  return remainingWorkingDays(todayIso, validUntil) < QUOTE_EXPIRING_WORKING_DAYS;
}
