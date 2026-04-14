import type { DetailHeaderStatusBadgeVariant } from '../../../components/pageLayout/detailHeaderStatusBadge';

function patentGrantStatusSemantic(status: string): 'success' | 'error' | 'default' {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'активный') return 'success';
  if (normalized === 'неактивный' || normalized === 'истек' || normalized === 'отозван') return 'error';
  return 'default';
}

export function patentGrantStatusTagPreset(status: string): 'success' | 'error' | 'default' {
  return patentGrantStatusSemantic(status);
}

export function patentGrantDetailHeaderBadgeVariant(status: string): DetailHeaderStatusBadgeVariant {
  const semantic = patentGrantStatusSemantic(status);
  if (semantic === 'success') return 'success';
  if (semantic === 'error') return 'danger';
  return 'neutral';
}
