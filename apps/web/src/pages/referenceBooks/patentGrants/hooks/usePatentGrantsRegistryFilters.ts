import { useCallback, useMemo, useState } from 'react';

import {
  DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  type PatentGrantsRegistryAdvancedFilters,
} from '../../../../api/patents/patentGrantsRegistryFilters.types';
import { countPatentGrantsRegistryFilters } from '../utils/patentGrantsRegistryFilterCount';

export function usePatentGrantsRegistryFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<PatentGrantsRegistryAdvancedFilters>(
    DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  );
  const [draftFilters, setDraftFilters] = useState<PatentGrantsRegistryAdvancedFilters>(
    DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  );

  const activeFiltersCount = useMemo(() => countPatentGrantsRegistryFilters(appliedFilters), [appliedFilters]);

  const updateDraftFilter = useCallback((patch: Partial<PatentGrantsRegistryAdvancedFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const openFiltersModal = useCallback(() => {
    setDraftFilters(appliedFilters);
    setIsFiltersModalOpen(true);
  }, [appliedFilters]);

  const closeFiltersModal = useCallback(() => {
    setIsFiltersModalOpen(false);
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    setIsFiltersModalOpen(false);
  }, [draftFilters]);

  const resetDraftFilters = useCallback(() => {
    setDraftFilters(DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    setAppliedFilters,
    draftFilters,
    setDraftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  };
}
