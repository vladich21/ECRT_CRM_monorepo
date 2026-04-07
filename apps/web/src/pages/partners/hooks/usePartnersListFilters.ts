import { useCallback, useState } from 'react';

import { EMPTY_FILTERS, type PartnerFilters } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

function countActivePartnerFilters(filters: PartnerFilters): number {
  return (
    (filters.typeIds.length > 0 ? 1 : 0) +
    (filters.statusIds.length > 0 ? 1 : 0) +
    (filters.competenceIds.length > 0 ? 1 : 0)
  );
}

export function usePartnersListFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PartnerListTab>('all');
  const [appliedFilters, setAppliedFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const activeFiltersCount = countActivePartnerFilters(appliedFilters);

  const openFiltersModal = useCallback(() => {
    setDraftFilters(appliedFilters);
    setIsFiltersOpen(true);
  }, [appliedFilters]);

  const closeFiltersModal = useCallback(() => {
    setIsFiltersOpen(false);
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    setIsFiltersOpen(false);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setIsFiltersOpen(false);
  }, []);

  const updateDraftFilter = useCallback((patch: Partial<PartnerFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...patch }));
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    appliedFilters,
    setAppliedFilters,
    draftFilters,
    setDraftFilters,
    isFiltersOpen,
    openFiltersModal,
    closeFiltersModal,
    applyFilters,
    resetFilters,
    updateDraftFilter,
    activeFiltersCount,
  };
}
