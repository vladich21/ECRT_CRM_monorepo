import type { ReactNode } from 'react';

import badgeStyles from './detailHeaderStatusBadge.module.scss';

export type DetailHeaderStatusBadgeVariant =
  | 'activityActive'
  | 'activityInactive'
  | 'success'
  | 'danger'
  | 'info'
  | 'archive'
  | 'warning'
  | 'neutral';

export type DetailStatusBadge = {
  label: string;
  icon?: ReactNode;
  variant: DetailHeaderStatusBadgeVariant;
};

const VARIANT_CLASS: Record<DetailHeaderStatusBadgeVariant, string> = {
  activityActive: `${badgeStyles.badge} ${badgeStyles.activityActive}`,
  activityInactive: `${badgeStyles.badge} ${badgeStyles.activityInactive}`,
  success: `${badgeStyles.badge} ${badgeStyles.success}`,
  danger: `${badgeStyles.badge} ${badgeStyles.danger}`,
  info: `${badgeStyles.badge} ${badgeStyles.info}`,
  archive: `${badgeStyles.badge} ${badgeStyles.archive}`,
  warning: `${badgeStyles.badge} ${badgeStyles.warning}`,
  neutral: `${badgeStyles.badge} ${badgeStyles.neutral}`,
};

export function detailHeaderStatusBadgeClass(variant: DetailHeaderStatusBadgeVariant): string {
  return VARIANT_CLASS[variant];
}

export function detailHeaderVariantForPartnerStatusName(statusName: string): DetailHeaderStatusBadgeVariant {
  switch (statusName) {
    case 'Активный':
      return 'success';
    case 'Потенциальный':
      return 'info';
    case 'Заблокирован':
      return 'danger';
    case 'Архив':
      return 'archive';
    default:
      return 'info';
  }
}

export const PARTNER_STATUS_ID_TO_VARIANT: Partial<Record<string, DetailHeaderStatusBadgeVariant>> = {};

export function detailHeaderVariantForPartnerStatus(
  statusId: string,
  statusName: string,
): DetailHeaderStatusBadgeVariant {
  if (statusId) {
    const byId = PARTNER_STATUS_ID_TO_VARIANT[statusId];
    if (byId) return byId;
  }
  if (statusName) return detailHeaderVariantForPartnerStatusName(statusName);
  return 'info';
}

export function detailHeaderVariantForProjectStatus(status: string): DetailHeaderStatusBadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'completed':
    case 'cancelled':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'paused':
      return 'archive';
    default:
      return 'success';
  }
}

export function detailHeaderVariantForContractHeader(
  isDeleted: boolean,
  isActive: boolean,
): DetailHeaderStatusBadgeVariant {
  if (isDeleted) return 'danger';
  return isActive ? 'success' : 'danger';
}

export function detailHeaderVariantForPatentRecord(isDeleted: boolean): DetailHeaderStatusBadgeVariant {
  return isDeleted ? 'danger' : 'success';
}
