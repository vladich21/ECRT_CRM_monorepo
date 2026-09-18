/** Пустые значения в query не отправляем: бэк отличает «не задано» от «пусто». */
export function compactParams(obj: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
}
