import { getPartnerStatusSurface } from '../../constants/statusBadgeSurfaces';

/** Текстовый цвет статуса (редкие места, где нужен только hex). */
export const PARTNER_STATUS_BADGE_COLORS: Record<string, string> = {
  Активный: getPartnerStatusSurface('Активный').color,
  Потенциальный: getPartnerStatusSurface('Потенциальный').color,
  Заблокирован: getPartnerStatusSurface('Заблокирован').color,
  Архив: getPartnerStatusSurface('Архив').color,
};
