import type { Patent } from '../../../types/patent';
import type { PatentAdvancedFilters } from '../PatentsListPage.types';
import type { ReferenceDataForPatents } from '../data';

/** Фильтрация по расширенным фильтрам (подразделение, состояние, авторы, ответственный) */
export function filterByAdvanced(
  patents: Patent[],
  filters: PatentAdvancedFilters
): Patent[] {
  let result = patents;

  if (filters.departmentId != null) {
    result = result.filter((p) => p.department_id === filters.departmentId);
  }
  if (filters.statusId != null) {
    result = result.filter((p) => p.status_id === filters.statusId);
  }
  if (filters.authorIds.length > 0) {
    result = result.filter((p) =>
      p.author_ids?.some((id) => filters.authorIds.includes(id))
    );
  }
  if (filters.responsibleId != null) {
    result = result.filter((p) => String(p.created_by) === filters.responsibleId);
  }

  return result;
}

/** Фильтрация по поисковому запросу (наименование, номер регистрации, номер КД) */
export function filterBySearch(
  patents: Patent[],
  searchQuery: string,
  _refs?: ReferenceDataForPatents
): Patent[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return patents;

  return patents.filter(
    (p) =>
      p.name?.toLowerCase().includes(q) ||
      p.registration_number?.toLowerCase().includes(q) ||
      p.kd_number?.toLowerCase().includes(q)
  );
}

/** Подсчёт количества активных расширенных фильтров */
export function countActivePatentFilters(filters: PatentAdvancedFilters): number {
  return [
    filters.departmentId != null,
    filters.statusId != null,
    filters.authorIds.length > 0,
    filters.responsibleId != null,
  ].filter(Boolean).length;
}
