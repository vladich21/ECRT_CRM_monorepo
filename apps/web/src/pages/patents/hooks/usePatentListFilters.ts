import { useState, useCallback, useMemo } from 'react';
import type { PatentAdvancedFilters, PatentFilterTab } from '../PatentsListPage.types';
import { DEFAULT_PATENT_FILTERS } from '../PatentsListPage.types';
import { countActivePatentFilters } from '../filters/patentListFilters';
export function usePatentListFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PatentFilterTab>('all');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<PatentAdvancedFilters>(DEFAULT_PATENT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PatentAdvancedFilters>(DEFAULT_PATENT_FILTERS);
  const activeFiltersCount = useMemo(() => countActivePatentFilters(appliedFilters), [appliedFilters]);
  const updateDraftFilter = useCallback((patch: Partial<PatentAdvancedFilters>) => {
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
    setDraftFilters(DEFAULT_PATENT_FILTERS);
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
    setAppliedFilters,
    draftFilters,
    setDraftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  };
}
