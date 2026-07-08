import { useCallback, useMemo, useState } from 'react';

import {
  DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  type PatentGrantsRegistryAdvancedFilters,
  type PatentGrantsRegistrySortBy,
} from '@/api/patents/patentGrantsRegistryFilters.types';
import { countPatentGrantsRegistryFilters } from '../utils/patentGrantsRegistryFilterCount';

const DEFAULT_SORT_BY: PatentGrantsRegistrySortBy = 'patent_registration_number';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

const DEFAULT_SORT_ORDER_BY_FIELD: Record<PatentGrantsRegistrySortBy, 'asc' | 'desc'> = {
  patent_registration_number: 'asc',
  grant_date: 'desc',
  grant_number: 'asc',
  created_at: 'desc',
};

export function usePatentGrantsRegistryFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<PatentGrantsRegistryAdvancedFilters>(
    DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  );
  const [draftFilters, setDraftFilters] = useState<PatentGrantsRegistryAdvancedFilters>(
    DEFAULT_PATENT_GRANTS_REGISTRY_ADVANCED_FILTERS,
  );
  const [sortBy, setSortBy] = useState<PatentGrantsRegistrySortBy>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(DEFAULT_SORT_ORDER);

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

  const setSortField = useCallback((field: PatentGrantsRegistrySortBy) => {
    setSortBy(field);
    setSortOrder(DEFAULT_SORT_ORDER_BY_FIELD[field] ?? 'asc');
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const restoreListSorting = useCallback(
    (next: { sortBy: PatentGrantsRegistrySortBy; sortOrder: 'asc' | 'desc' }) => {
      setSortBy(next.sortBy);
      setSortOrder(next.sortOrder);
    },
    [],
  );

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
    sortBy,
    sortOrder,
    setSortField,
    toggleSortOrder,
    restoreListSorting,
  };
}
