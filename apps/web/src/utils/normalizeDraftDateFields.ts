import dayjs from 'dayjs';

/**
 * Converts raw date values in a form draft (strings, numbers, Date instances) to
 * dayjs objects so AntD DatePicker can render them correctly after JSON round-trip.
 * Mutates a copy of the draft — the original object is never changed.
 */
export function normalizeDraftDateFields<T extends Record<string, unknown>>(
  draft: T,
  dateFields: readonly (keyof T & string)[],
): T {
  const normalized = { ...draft };
  for (const key of dateFields) {
    const raw = normalized[key];
    if (!raw) {
      (normalized as Record<string, unknown>)[key] = null;
      continue;
    }
    if (dayjs.isDayjs(raw)) continue;
    const parsed = dayjs(raw as string | number | Date);
    (normalized as Record<string, unknown>)[key] = parsed.isValid() ? parsed : null;
  }
  return normalized;
}
