import { useMemo } from 'react';

import { Partner } from '../../../types/partner';

export const useFilteredPartners = (partners: Partner[], filters: Record<string, any>) => {
  const filteredPartners = useMemo(() => {
    if (!partners.length) return [];
    return partners.filter(partner => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          partner.name?.toLowerCase().includes(searchLower) ||
          partner.short_name?.toLowerCase().includes(searchLower) ||
          partner.inn?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.type_ids) {
        const filterTypeIds = Array.isArray(filters.type_ids)
          ? filters.type_ids.map((id: string) => String(id))
          : [String(filters.type_ids)];
        const hasMatchingType = (partner.type_ids ?? []).some(typeId => filterTypeIds.includes(typeId));
        if (!hasMatchingType) return false;
      }
      if (filters.status_ids) {
        const statusIds = Array.isArray(filters.status_ids)
          ? filters.type_ids.map((id: string) => String(id))
          : [String(filters.status_ids)];
        if (!statusIds.includes(partner.status_id)) {
          return false;
        }
      }
      if (filters.competence_ids) {
        const filterCompetenceIds = Array.isArray(filters.competence_ids)
          ? filters.competence_ids.map((id: string) => String(id))
          : [String(filters.competence_ids)];
        const hasMatchingCompetence = (partner.competence_ids ?? []).some(compId =>
          filterCompetenceIds.includes(compId),
        );
        if (!hasMatchingCompetence) return false;
      }
      return true;
    });
  }, [partners, filters]);
  return filteredPartners;
};
