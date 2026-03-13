import { useState, useCallback } from 'react';
import type { AdvancedFilters, FilterTab } from '../list/ContractsListPage.types';
import { DEFAULT_ADVANCED_FILTERS } from '../list/ContractsListPage.types';
import { countActiveFilters } from '../filters/contractListFilters';

type UseContractListFiltersParams = {
  validateFilters?: (filters: AdvancedFilters) => string | null;
};

export function useContractListFilters({
  validateFilters,
}: UseContractListFiltersParams = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>(
    DEFAULT_ADVANCED_FILTERS
  );
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(
    DEFAULT_ADVANCED_FILTERS
  );

  const activeFiltersCount = countActiveFilters(appliedFilters);

  const updateDraftFilter = useCallback((patch: Partial<AdvancedFilters>) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const openFiltersModal = useCallback(() => {
    setDraftFilters(appliedFilters);
    setIsFiltersModalOpen(true);
  }, [appliedFilters]);

  const closeFiltersModal = useCallback(() => {
    setIsFiltersModalOpen(false);
  }, []);

  const applyFilters = useCallback(() => {
    const error = validateFilters?.(draftFilters);
    if (error) {
      return { success: false, error };
    }
    setAppliedFilters(draftFilters);
    setIsFiltersModalOpen(false);
    return { success: true };
  }, [draftFilters, validateFilters]);

  const resetDraftFilters = useCallback(() => {
    setDraftFilters(DEFAULT_ADVANCED_FILTERS);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    draftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  };
}
