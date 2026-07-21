/** Границы текущего календарного месяца (локальное время). */
export function getCurrentMonthRange(now = new Date()): { start: Date; end: Date; daysInMonth: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end, daysInMonth: end.getDate() };
}

const MS_PER_DAY = 86_400_000;

/** scrollLeft при шкале в днях. */
export function dateToScrollLeft(date: Date, scaleStart: Date, cellWidth: number): number {
  const a = new Date(scaleStart.getFullYear(), scaleStart.getMonth(), scaleStart.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((b - a) / MS_PER_DAY);
  return Math.max(0, days * cellWidth);
}

/** scrollLeft при шкале в месяцах (minUnit = month). */
export function monthToScrollLeft(date: Date, scaleStart: Date, cellWidth: number): number {
  const months =
    (date.getFullYear() - scaleStart.getFullYear()) * 12 + (date.getMonth() - scaleStart.getMonth());
  return Math.max(0, months * cellWidth);
}
