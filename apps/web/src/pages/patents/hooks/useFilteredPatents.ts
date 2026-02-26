import { useMemo } from 'react';
import { Patent } from '../../../types/patent';

export const useFilteredPatents = (patents: Patent[], filters: Record<string, any>) => {
  const filteredPatents = useMemo(() => {
    if (!patents.length) return [];

    return patents.filter(patent => {
      // Поиск по тексту
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          patent.name?.toLowerCase().includes(searchLower) ||
          patent.registration_number?.toLowerCase().includes(searchLower) ||
          patent.kd_number?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      // Фильтр по отделу
      if (filters.department && patent.department_id !== Number(filters.department)) {
        return false;
      }

      // Фильтр по ответственному
      if (filters.created_by && patent.created_by !== filters.created_by) {
        return false;
      }

      // Фильтр по ролям
      if (filters.author_ids && patent.author_ids?.length > 0) {
        const hasMatchingRole = patent.author_ids.includes(Number(filters.author_ids));
        if (!hasMatchingRole) return false;
      }

      // Фильтр по статусу
      if (filters.patents_status_id && patent.patents_status_id !== Number(filters.department)) {
        return false;
      }

      return true;
    });
  }, [patents, filters]);

  return filteredPatents;
};
