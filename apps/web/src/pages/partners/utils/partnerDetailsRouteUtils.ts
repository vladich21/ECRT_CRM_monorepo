export function getPartnerDetailsActiveTab(pathname: string): string {
  if (pathname.includes('/contacts')) return 'contacts';
  if (pathname.includes('/contracts')) return 'contracts';
  if (pathname.includes('/evaluations')) return 'evaluations';
  if (pathname.includes('/comments')) return 'comments';
  if (pathname.includes('/files')) return 'files';
  if (pathname.includes('/verification')) return 'verification';
  return 'main';
}
