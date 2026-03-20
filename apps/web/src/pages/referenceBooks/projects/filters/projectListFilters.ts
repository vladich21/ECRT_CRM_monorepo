import type { Project } from '../../../../types/referenceTypes';
import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';

/** Сколько расширенных фильтров активно (для бейджа на кнопке). */
export function countActiveProjectFilters(filters: ProjectAdvancedFilters): number {
  let c = 0;
  if (filters.managerId) c++;
  if (filters.createdById) c++;
  if (filters.overlapRange?.[0] && filters.overlapRange?.[1]) c++;
  if (filters.startDateRange?.[0] || filters.startDateRange?.[1]) c++;
  if (filters.endDateRange?.[0] || filters.endDateRange?.[1]) c++;
  if (filters.endDatePresence !== 'any') c++;
  return c;
}

export function filterByTab(projects: Project[], tab: ProjectFilterTab): Project[] {
  if (tab === 'all') return projects;
  return projects.filter((project) => project.status === tab);
}

/** Клиентская фильтрация (список проектов на сервере; функция — для превью/тестов). */
export function filterByAdvanced(projects: Project[], filters: ProjectAdvancedFilters): Project[] {
  let result = projects;
  if (filters.managerId != null) {
    result = result.filter((project) => project.manager_id === filters.managerId);
  }
  if (filters.createdById != null) {
    result = result.filter((project) => project.created_by === filters.createdById);
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
