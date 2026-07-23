/**
 * Производственный календарь SRN (MIT-кастомизация поверх SVAR).
 * Выходные: сб/вс. Праздники РФ — фиксированный набор по годам (расширяется по мере надобности).
 */

const MS_PER_DAY = 86_400_000;

/** YYYY-MM-DD праздничные дни (нерабочие). */
const RU_HOLIDAYS = new Set<string>([
  // 2025
  '2025-01-01',
  '2025-01-02',
  '2025-01-03',
  '2025-01-06',
  '2025-01-07',
  '2025-01-08',
  '2025-02-23',
  '2025-03-08',
  '2025-05-01',
  '2025-05-02',
  '2025-05-09',
  '2025-06-12',
  '2025-11-04',
  // 2026
  '2026-01-01',
  '2026-01-02',
  '2026-01-03',
  '2026-01-04',
  '2026-01-05',
  '2026-01-06',
  '2026-01-07',
  '2026-01-08',
  '2026-01-09',
  '2026-02-23',
  '2026-03-08',
  '2026-03-09', // перенос с вс 08.03 (типичный перенос — уточняйте по производственному календарю)
  '2026-05-01',
  '2026-05-09',
  '2026-05-11', // перенос
  '2026-06-12',
  '2026-11-04',
  // 2027
  '2027-01-01',
  '2027-01-02',
  '2027-01-03',
  '2027-01-04',
  '2027-01-05',
  '2027-01-06',
  '2027-01-07',
  '2027-01-08',
  '2027-02-23',
  '2027-03-08',
  '2027-05-01',
  '2027-05-09',
  '2027-06-12',
  '2027-11-04',
]);

export function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCalendarDays(date: Date, days: number): Date {
  const next = toDayStart(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toIsoDate(date: Date): string {
  const d = toDayStart(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekend(date: Date): boolean {
  const day = toDayStart(date).getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date): boolean {
  return RU_HOLIDAYS.has(toIsoDate(date));
}

export function isWorkingDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

/** Если день рабочий — он же; иначе ближайший следующий рабочий. */
export function nextWorkingDay(date: Date): Date {
  let current = toDayStart(date);
  // защита от бесконечного цикла при битом календаре
  for (let i = 0; i < 370; i += 1) {
    if (isWorkingDay(current)) return current;
    current = addCalendarDays(current, 1);
  }
  return toDayStart(date);
}

/**
 * Старт последователя FS: первый рабочий день строго после окончания предшественника.
 */
export function startAfterPredecessorEnd(predecessorEnd: Date): Date {
  return nextWorkingDay(addCalendarDays(predecessorEnd, 1));
}

export type GanttHighlightUnit = 'day' | 'hour';

/**
 * CSS-класс для ячейки шкалы SVAR (`highlightTime`).
 * Пустая строка — обычный день.
 */
export function highlightWorkCalendar(date: Date, unit: GanttHighlightUnit): string {
  if (unit !== 'day') return '';
  if (isHoliday(date)) return 'gantt-holiday';
  if (isWeekend(date)) return 'gantt-weekend';
  return '';
}

export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  let current = toDayStart(start);
  const endMs = toDayStart(end).getTime();
  while (current.getTime() <= endMs) {
    if (isWorkingDay(current)) count += 1;
    current = addCalendarDays(current, 1);
  }
  return count;
}

/** Для отладки / тестов: сколько мс в сутках (не экспортировать в UI). */
export const _MS_PER_DAY = MS_PER_DAY;
