import type { Project } from '../../../../types/referenceTypes';
import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';

export function filterByTab(projects: Project[], tab: ProjectFilterTab): Project[] {
  if (tab === 'all') return projects;
  return projects.filter((p) => p.status === tab);
}

export function filterByAdvanced(projects: Project[], filters: ProjectAdvancedFilters): Project[] {
  let result = projects;
  if (filters.managerId != null) {
    result = result.filter((p) => p.manager_id === filters.managerId);
  }
  return result;
}

export function filterBySearch(projects: Project[], query: string): Project[] {
  const q = query.trim().toLowerCase();
  if (!q) return projects;
  return projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(q) ||
      p.short_name?.toLowerCase().includes(q) ||
      String(p.code).toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
  );
}
