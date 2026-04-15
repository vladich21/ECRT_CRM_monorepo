import type { DetailHeaderStatusBadgeVariant } from '../../../../components/pageLayout/detailHeaderStatusBadge';
import type { CSSProperties } from 'react';

function patentGrantStatusSemantic(status: string): 'success' | 'error' | 'default' {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'активный') return 'success';
  if (normalized === 'неактивный' || normalized === 'истек' || normalized === 'отозван') return 'error';
  return 'default';
}

export function patentGrantStatusTagPreset(status: string): 'success' | 'error' | 'default' {
  return patentGrantStatusSemantic(status);
}

export function patentGrantStatusTagInlineStyle(status: string): CSSProperties {
  const semantic = patentGrantStatusSemantic(status);
  const paletteBySemantic: Record<'success' | 'error' | 'default', { text: string; bg: string; border: string }> = {
    success: { text: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
    error: { text: '#cf1322', bg: '#fff1f0', border: '#ffa39e' },
    default: { text: '#434343', bg: '#fafafa', border: '#d9d9d9' },
  };
  const palette = paletteBySemantic[semantic];

  return {
    color: palette.text,
    backgroundColor: palette.bg,
    border: `1px solid ${palette.border}`,
    borderRadius: 4,
  };
}

export function patentGrantDetailHeaderBadgeVariant(status: string): DetailHeaderStatusBadgeVariant {
  const semantic = patentGrantStatusSemantic(status);
  if (semantic === 'success') return 'success';
  if (semantic === 'error') return 'danger';
  return 'neutral';
}

