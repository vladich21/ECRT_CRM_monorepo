import type { PartnerRegistryStatus } from '../../types/partnerRegistry';

export const STATUS_CONFIG: Record<PartnerRegistryStatus, { label: string; color: string }> = {
  active: { label: 'Активен', color: '#52c41a' },
  potential: { label: 'Потенциальный', color: '#1677ff' },
  blocked: { label: 'Заблокирован', color: '#ff4d4f' },
  archive: { label: 'Архив', color: '#8c8c8c' },
};

export const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  supplier: { label: 'Поставщик', color: '#1677ff' },
  customer: { label: 'Заказчик', color: '#722ed1' },
  default: { label: 'Контрагент', color: '#8c8c8c' },
};
