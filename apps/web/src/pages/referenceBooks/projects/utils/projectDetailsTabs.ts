export type ProjectDetailsTabKey = 'main' | 'project-documents';

export function getActiveProjectDetailsTab(pathname: string): ProjectDetailsTabKey {
  if (pathname.includes('/project-documents')) return 'project-documents';
  return 'main';
}

export function getProjectDetailsTabPath(projectId: string, tabKey: ProjectDetailsTabKey): string {
  const base = `/projects/${projectId}`;
  if (tabKey === 'main') return base;
  return `${base}/project-documents`;
}
