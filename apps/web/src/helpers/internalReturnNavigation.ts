export function isSafeInternalReturnPath(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://');
}

export function resolveInternalReturnPath(from: string | undefined | null, defaultPath: string): string {
  const trimmed = from?.trim();
  if (trimmed && isSafeInternalReturnPath(trimmed)) {
    return trimmed;
  }
  return defaultPath;
}

export function getInternalReturnBackLabel(returnPath: string, defaultLabel: string): string {
  if (returnPath.startsWith('/patent-grants/')) {
    return 'К охранному документу';
  }
  if (returnPath.startsWith('/patents/')) {
    return 'К РИД';
  }
  if (returnPath.includes('/partners/') && returnPath.includes('/contracts')) {
    return 'К договорам контрагента';
  }
  return defaultLabel;
}
