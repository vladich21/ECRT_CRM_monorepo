export function formatSwStatusLabel(label: string | undefined, fallback: string): string {
  const raw = (label ?? fallback).trim();
  return raw ? raw.charAt(0).toLowerCase() + raw.slice(1) : fallback;
}

const STATUS_CLASS_KEYS: Record<string, string> = {
  development: 'statusDevelopment',
  in_approval: 'statusInApproval',
  agreed: 'statusAgreed',
  approved: 'statusApproved',
  revision: 'statusRevision',
  received: 'statusReceived',
  accepted: 'statusAccepted',
  in_rework: 'statusInRework',
  issued: 'statusIssued',
  cancelled: 'statusCancelled',
  in_ips: 'statusInIps',
};

export function swStatusBadgeClass(statusCode: string, styles: Record<string, string>): string {
  const variant = STATUS_CLASS_KEYS[statusCode] ?? 'statusDefault';
  return [styles.statusBadge, styles[variant]].filter(Boolean).join(' ');
}
