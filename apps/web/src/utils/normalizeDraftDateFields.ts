import dayjs from 'dayjs';

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
