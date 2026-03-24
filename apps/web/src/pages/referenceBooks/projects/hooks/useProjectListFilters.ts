import { useCallback, useMemo, useState } from 'react';

import { countActiveProjectFilters } from '../filters/projectListFilters';
import { DEFAULT_PROJECT_FILTERS, type ProjectAdvancedFilters, type ProjectFilterTab } from '../ProjectsListPage.types';

export function useProjectListFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ProjectFilterTab>('all');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ProjectAdvancedFilters>(DEFAULT_PROJECT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ProjectAdvancedFilters>(DEFAULT_PROJECT_FILTERS);
  const activeFiltersCount = useMemo(() => countActiveProjectFilters(appliedFilters), [appliedFilters]);
  const updateDraftFilter = useCallback((patch: Partial<ProjectAdvancedFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...patch }));
  }, []);
  const openFiltersModal = useCallback(() => {
    setDraftFilters(appliedFilters);
    setIsFiltersModalOpen(true);
  }, [appliedFilters]);
  const closeFiltersModal = useCallback(() => setIsFiltersModalOpen(false), []);
  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    setIsFiltersModalOpen(false);
  }, [draftFilters]);
  const resetDraftFilters = useCallback(() => setDraftFilters(DEFAULT_PROJECT_FILTERS), []);
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
