import type { CSSProperties } from 'react';

import { APP_COLOR_SUCCESS, APP_COLOR_SUCCESS_BG, APP_COLOR_SUCCESS_BORDER } from './appColors';
import type { PartnerRegistryStatus } from '../types/partnerRegistry';
import type { SupplierEvaluationCategory } from '../types/supplierEvaluation';

export type StatusBadgeSurface = {
  background: string;
  borderColor: string;
  color: string;
};

export const SURFACE_ACTIVE: StatusBadgeSurface = {
  background: APP_COLOR_SUCCESS_BG,
  borderColor: APP_COLOR_SUCCESS_BORDER,
  color: APP_COLOR_SUCCESS,
};

export const SURFACE_POTENTIAL: StatusBadgeSurface = {
  background: '#eff6ff',
  borderColor: '#bfdbfe',
  color: '#1d4ed8',
};

export const SURFACE_BLOCKED: StatusBadgeSurface = {
  background: '#fef2f2',
  borderColor: '#fecaca',
  color: '#b91c1c',
};

export const SURFACE_ARCHIVE: StatusBadgeSurface = {
  background: '#f9fafb',
  borderColor: '#e5e7eb',
  color: '#4b5563',
};

export const SURFACE_WARNING: StatusBadgeSurface = {
  background: '#fffbeb',
  borderColor: '#fde68a',
  color: '#b45309',
};

export const SURFACE_NEUTRAL: StatusBadgeSurface = {
  background: '#fafafa',
  borderColor: '#e8e8e8',
  color: '#737373',
};

export const PROJECT_STATUS_SURFACES = {
  active: SURFACE_ACTIVE,
  completed: SURFACE_BLOCKED,
  pending: SURFACE_WARNING,
  paused: SURFACE_ARCHIVE,
  cancelled: SURFACE_BLOCKED,
} as const;

const PARTNER_NAME_TO_SURFACE: Record<string, StatusBadgeSurface> = {
  Активный: SURFACE_ACTIVE,
  Потенциальный: SURFACE_POTENTIAL,
  Заблокирован: SURFACE_BLOCKED,
  Архив: SURFACE_ARCHIVE,
};

export function getPartnerStatusSurface(statusName: string): StatusBadgeSurface {
  return PARTNER_NAME_TO_SURFACE[statusName] ?? SURFACE_POTENTIAL;
}

const REGISTRY_STATUS_MAP: Record<PartnerRegistryStatus, StatusBadgeSurface> = {
  active: SURFACE_ACTIVE,
  potential: SURFACE_POTENTIAL,
  blocked: SURFACE_BLOCKED,
  archive: SURFACE_ARCHIVE,
};

export function getPartnerRegistryStatusSurface(status: PartnerRegistryStatus): StatusBadgeSurface {
  return REGISTRY_STATUS_MAP[status];
}

export function getProjectStatusSurface(status: string): StatusBadgeSurface {
  const surface = PROJECT_STATUS_SURFACES[status as keyof typeof PROJECT_STATUS_SURFACES];
  return surface ?? SURFACE_ACTIVE;
}

export function getPatentRecordSurface(isDeleted: boolean): StatusBadgeSurface {
  return isDeleted ? SURFACE_BLOCKED : SURFACE_ACTIVE;
}

export function getContractHeaderSurface(isDeleted: boolean, isActive: boolean): StatusBadgeSurface {
  if (isDeleted) return SURFACE_BLOCKED;
  return isActive ? SURFACE_ACTIVE : SURFACE_BLOCKED;
}

export const SURFACE_ACTIVITY_ACTIVE: StatusBadgeSurface = {
  background: 'rgba(82, 196, 26, 0.125)',
  borderColor: 'rgba(82, 196, 26, 0.314)',
  color: 'rgb(82, 196, 26)',
};

export const SURFACE_ACTIVITY_INACTIVE: StatusBadgeSurface = {
  background: 'rgba(255, 77, 79, 0.125)',
  borderColor: 'rgba(255, 77, 79, 0.314)',
  color: 'rgb(255, 77, 79)',
};

export function getActiveInactiveSurface(isActive: boolean): StatusBadgeSurface {
  return isActive ? SURFACE_ACTIVITY_ACTIVE : SURFACE_ACTIVITY_INACTIVE;
}

type SupplierEvalRowPresentationStatus = 'blocked' | 'archived' | 'overdue' | 'soon' | 'active';

export function getSupplierEvalRowSurface(status: SupplierEvalRowPresentationStatus): StatusBadgeSurface {
  switch (status) {
    case 'blocked':
    case 'overdue':
      return SURFACE_BLOCKED;
    case 'archived':
      return SURFACE_ARCHIVE;
    case 'soon':
      return SURFACE_WARNING;
    default:
      return SURFACE_ACTIVE;
  }
}

export function getCategorySurface(category: SupplierEvaluationCategory): StatusBadgeSurface {
  switch (category) {
    case 'A':
      return SURFACE_ACTIVE;
    case 'B':
      return SURFACE_POTENTIAL;
    case 'C':
      return SURFACE_WARNING;
    default:
      return SURFACE_BLOCKED;
  }
}

export function mutedTagStyle(surface: StatusBadgeSurface, extra?: CSSProperties): CSSProperties {
  return {
    margin: 0,
    background: surface.background,
    border: `1px solid ${surface.borderColor}`,
    color: surface.color,
    ...extra,
  };
}
