import type { Project } from '../../../../types/referenceTypes';
import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';

const PROJECT_NON_ACTIVE_STATUSES = new Set(['completed', 'pending', 'paused', 'cancelled']);

export function countActiveProjectFilters(filters: ProjectAdvancedFilters): number {
  let c = 0;
  if (filters.managerId) c++;
  if (filters.purchaserId) c++;
  if (filters.overlapRange?.[0] && filters.overlapRange?.[1]) c++;
  if (filters.startDateRange?.[0] || filters.startDateRange?.[1]) c++;
  if (filters.endDateRange?.[0] || filters.endDateRange?.[1]) c++;
  if (filters.endDatePresence !== 'any') c++;
  return c;
}
export function filterByTab(projects: Project[], tab: ProjectFilterTab): Project[] {
  if (tab === 'all') return projects;
  if (tab === 'deleted') return projects.filter(project => project.is_deleted);
  if (tab === 'active') {
    return projects.filter(project => {
      const s = (project.status ?? '').trim();
      if (s === '' || s === 'active') return true;
      return !PROJECT_NON_ACTIVE_STATUSES.has(s);
    });
  }
  return projects.filter(project => project.status === tab);
}
export function filterByAdvanced(projects: Project[], filters: ProjectAdvancedFilters): Project[] {
  let result = projects;
  if (filters.managerId != null) {
    result = result.filter(project => project.manager_id === filters.managerId);
  }
  if (filters.purchaserId != null) {
    result = result.filter(project => project.purchaser_id === filters.purchaserId);
  }
  return result;
}
export function filterBySearch(projects: Project[], query: string): Project[] {
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) return projects;
  return projects.filter(
    project =>
      project.name?.toLowerCase().includes(queryLower) ||
      project.short_name?.toLowerCase().includes(queryLower) ||
      String(project.code).toLowerCase().includes(queryLower) ||
      project.description?.toLowerCase().includes(queryLower),
  );
}
