export function isPartnerCreateRestricted(): boolean {
  const raw = String(import.meta.env.VITE_PARTNER_CREATE_RESTRICTED ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export const PARTNER_CREATE_RESTRICTED_MESSAGE =
  'Для добавления нового контрагента создайте его в Тезисе. Он автоматически появится в PMDB в течение 15 минут.';
