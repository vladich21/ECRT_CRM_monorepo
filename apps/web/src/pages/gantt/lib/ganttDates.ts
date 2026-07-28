/** Общие хелперы дат для Gantt (локальный календарный день, без UTC-сдвига). */

import { addCalendarDays, toDayStart } from './workCalendar';

const MS_PER_DAY = 86_400_000;

export function parseIsoDate(iso: string | null | undefined): Date | undefined {
  if (!iso?.trim()) return undefined;
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const d = toDayStart(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof value === 'string' && value.trim()) return value.slice(0, 10);
  return null;
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Если дат нет — безопасный диапазон от дат родителя / календарный год. */
export function ensureDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  fallbackStart?: string,
  fallbackEnd?: string,
): { start: string; end: string } {
  const year = new Date().getFullYear();
  const defaultStart = fallbackStart?.trim() || `${year}-01-01`;
  const defaultEnd = fallbackEnd?.trim() || fallbackStart?.trim() || `${year}-12-31`;
  const s = start?.trim() || defaultStart;
  const e = end?.trim() || start?.trim() || defaultEnd;
  return s <= e ? { start: s, end: e } : { start: e, end: s };
}

export function cloneDate(value: Date | undefined | null): Date | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return undefined;
  return new Date(value.getTime());
}

/** Календарный день как UTC-ключ (без времени). */
export function dayKey(value: Date | undefined | null): number | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

export function formatDateRu(value: Date | string | undefined | null): string {
  if (typeof value === 'string') {
    const parsed = parseIsoDate(value);
    return parsed ? parsed.toLocaleDateString('ru-RU') : value;
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '—';
  return value.toLocaleDateString('ru-RU');
}

/** Inclusive calendar-day duration (как в SVAR day unit). */
export function durationFromRange(start: Date, end: Date): number {
  const startMs = toDayStart(start).getTime();
  const endMs = toDayStart(end).getTime();
  return Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY) + 1);
}

export function endFromStartAndDuration(start: Date, duration: number): Date {
  return addCalendarDays(start, Math.max(1, duration) - 1);
}

export function durationDaysFromIso(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return 1;
  return durationFromRange(start, end);
}
