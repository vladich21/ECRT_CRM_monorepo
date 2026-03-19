import type { Project } from '../../../../types/referenceTypes';
import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';

export function filterByTab(projects: Project[], tab: ProjectFilterTab): Project[] {
  if (tab === 'all') return projects;
  return projects.filter((project) => project.status === tab);
}

export function filterByAdvanced(projects: Project[], filters: ProjectAdvancedFilters): Project[] {
  let result = projects;
  if (filters.managerId != null) {
    result = result.filter((project) => project.manager_id === filters.managerId);
  }
  return result;
}

export function filterBySearch(projects: Project[], query: string): Project[] {
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) return projects;
  return projects.filter(
    (project) =>
      project.name?.toLowerCase().includes(queryLower) ||
      project.short_name?.toLowerCase().includes(queryLower) ||
      String(project.code).toLowerCase().includes(queryLower) ||
      project.description?.toLowerCase().includes(queryLower)
  );
}
