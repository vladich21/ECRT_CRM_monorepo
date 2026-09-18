/** Короткие подписи столбцов свода (как в макете). */
export function getSummaryStatusShortLabel(code: string, scope: 'document' | 'sheet'): string {
  if (scope === 'sheet' && code === 'approved') return 'Подписан';
  const labels: Record<string, string> = {
    development: 'Разраб.',
    received: 'Получен',
    in_approval: 'На согл.',
    agreed: 'Рассм.',
    revision: 'С замеч.',
    in_rework: 'На дораб.',
    approved: 'Согл.',
    accepted: 'Принят',
    in_ips: 'В IPS',
  };
  return labels[code] ?? code;
}
