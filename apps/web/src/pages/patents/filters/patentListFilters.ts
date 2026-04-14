import type { Patent } from '../../../types/patent';
import type { ReferenceDataForPatents } from '../data';
import type { PatentAdvancedFilters } from '../PatentsListPage.types';

export function filterByAdvanced(patents: Patent[], filters: PatentAdvancedFilters): Patent[] {
  let result = patents;
  if (filters.departmentId != null) {
    result = result.filter(patent => patent.department_id === filters.departmentId);
  }
  if (filters.statusId != null) {
    result = result.filter(patent => patent.status_id === filters.statusId);
  }
  if (filters.authorIds.length > 0) {
    result = result.filter(patent => patent.author_ids?.some(id => filters.authorIds.includes(id)));
  }
  if (filters.responsibleId != null) {
    result = result.filter(patent => String(patent.responsible_for_patenting_id) === filters.responsibleId);
  }
  if (filters.registrationYears.length > 0) {
    result = result.filter(patent => {
      if (!patent.registration_date) return false;
      const y = new Date(patent.registration_date).getFullYear();
      return filters.registrationYears.includes(y);
    });
  }
  if (filters.projectId != null) {
    result = result.filter(patent => patent.project_id === filters.projectId);
  }
  return result;
}
export function filterBySearch(patents: Patent[], searchQuery: string, _refs?: ReferenceDataForPatents): Patent[] {
  const queryLower = searchQuery.trim().toLowerCase();
  if (!queryLower) return patents;
  return patents.filter(
    patent =>
      patent.name?.toLowerCase().includes(queryLower) ||
      patent.registration_number?.toLowerCase().includes(queryLower) ||
      patent.kd_number?.toLowerCase().includes(queryLower),
  );
}
export function countActivePatentFilters(filters: PatentAdvancedFilters): number {
  return [
    filters.departmentId != null,
    filters.statusId != null,
    filters.authorIds.length > 0,
    filters.responsibleId != null,
    filters.registrationYears.length > 0,
    filters.projectId != null,
  ].filter(Boolean).length;
}
