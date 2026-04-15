import type { CSSProperties } from 'react';

import { APP_COLOR_SUCCESS, APP_COLOR_SUCCESS_BG, APP_COLOR_SUCCESS_BORDER } from './appColors';
import { patentRidWorkflowKind, type PatentRidWorkflowKind } from './patentRidWorkflowKind';
import type { PartnerRegistryStatus } from '../types/partnerRegistry';
import type { SupplierEvaluationCategory } from '../types/supplierEvaluation';

export type StatusBadgeSurface = {
  background: string;
  borderColor: string;
  color: string;
};

/** Как у `.success` / `.activityActive` в шапке: rgba-фон и бордер от одного базового цвета (Ant Design pattern). */
export const SEMANTIC_STATUS_TINT_BG_ALPHA = 0.125;
export const SEMANTIC_STATUS_TINT_BORDER_ALPHA = 0.314;

export function semanticStatusTintFromRgb(r: number, g: number, b: number, foreground: string): StatusBadgeSurface {
  return {
    background: `rgba(${r}, ${g}, ${b}, ${SEMANTIC_STATUS_TINT_BG_ALPHA})`,
    borderColor: `rgba(${r}, ${g}, ${b}, ${SEMANTIC_STATUS_TINT_BORDER_ALPHA})`,
    color: foreground,
  };
}

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

/**
 * Цвета РИД: один базовый RGB → полупрозрачный фон/бордер (см. `semantic-tinted-badge` в variables.scss).
 * Отказ — тот же красный тон, что и `.danger` в шапке.
 */
export const SURFACE_RID_SUBMITTED_CIR = semanticStatusTintFromRgb(22, 119, 255, '#1677ff');
export const SURFACE_RID_OFFICE_REVIEW = semanticStatusTintFromRgb(250, 173, 20, '#d48806');
export const SURFACE_RID_REVIEW_QUERY = semanticStatusTintFromRgb(250, 140, 22, '#d4380d');
export const SURFACE_RID_REFUSAL = semanticStatusTintFromRgb(255, 77, 79, '#ff4d4f');
export const SURFACE_RID_TRANSFORMATION = semanticStatusTintFromRgb(235, 47, 150, '#c41d7f');
export const SURFACE_RID_DECISION = semanticStatusTintFromRgb(24, 144, 255, '#0050b3');
export const SURFACE_RID_DRAFT = semanticStatusTintFromRgb(140, 140, 140, '#737373');

const PATENT_RID_SURFACE_BY_KIND: Record<PatentRidWorkflowKind, StatusBadgeSurface> = {
  doc_prep: SURFACE_RID_DRAFT,
  submitted_cir: SURFACE_RID_SUBMITTED_CIR,
  office_review: SURFACE_RID_OFFICE_REVIEW,
  review_query: SURFACE_RID_REVIEW_QUERY,
  refusal: SURFACE_RID_REFUSAL,
  transformation: SURFACE_RID_TRANSFORMATION,
  decision: SURFACE_RID_DECISION,
  issued: semanticStatusTintFromRgb(82, 196, 26, '#52c41a'),
  unknown: SURFACE_RID_DRAFT,
};

export function getPatentRidWorkflowSurface(statusName: string | undefined): StatusBadgeSurface {
  return PATENT_RID_SURFACE_BY_KIND[patentRidWorkflowKind(statusName)];
}

export function getContractHeaderSurface(isDeleted: boolean, isActive: boolean): StatusBadgeSurface {
  if (isDeleted) return SURFACE_BLOCKED;
  return isActive ? SURFACE_ACTIVE : SURFACE_BLOCKED;
}

export const SURFACE_ACTIVITY_ACTIVE = semanticStatusTintFromRgb(82, 196, 26, 'rgb(82, 196, 26)');

export const SURFACE_ACTIVITY_INACTIVE = semanticStatusTintFromRgb(255, 77, 79, 'rgb(255, 77, 79)');

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
