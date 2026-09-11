/** Дата и время без запятой и без «·» — как в журнале Тезиса: 10.09.2026 14:10 */
export function formatApprovalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

export function ruStepsLabel(count: number): string {
  const n = Math.abs(count) % 100;
  const digit = n % 10;
  if (n > 10 && n < 20) return `${count} шагов`;
  if (digit === 1) return `${count} шаг`;
  if (digit >= 2 && digit <= 4) return `${count} шага`;
  return `${count} шагов`;
}
