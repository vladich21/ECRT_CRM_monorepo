import type { PartnerRegistryStatus } from '../../types/partnerRegistry';
import {
  SURFACE_ACTIVE,
  SURFACE_ARCHIVE,
  SURFACE_BLOCKED,
  SURFACE_POTENTIAL,
  type StatusBadgeSurface,
} from '../../constants/statusBadgeSurfaces';

export const STATUS_CONFIG: Record<PartnerRegistryStatus, { label: string } & StatusBadgeSurface> = {
  active: { label: 'Активен', ...SURFACE_ACTIVE },
  potential: { label: 'Потенциальный', ...SURFACE_POTENTIAL },
  blocked: { label: 'Заблокирован', ...SURFACE_BLOCKED },
  archive: { label: 'Архив', ...SURFACE_ARCHIVE },
};

export const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  supplier: { label: 'Поставщик', color: '#1677ff' },
  customer: { label: 'Заказчик', color: '#722ed1' },
  default: { label: 'Контрагент', color: '#8c8c8c' },
};
