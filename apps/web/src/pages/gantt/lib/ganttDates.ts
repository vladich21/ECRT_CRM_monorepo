/** Общие хелперы дат для Gantt (локальный календарный день, без UTC-сдвига). */

export function parseIsoDate(iso: string | null | undefined): Date | undefined {
  if (!iso?.trim()) return undefined;
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
