import { useCallback, useMemo, useState } from 'react';

import type { PatentListSortBy } from '@/api/patents/patentApi';

import { countActivePatentFilters } from '../filters/patentListFilters';
import {
  DEFAULT_PATENT_FILTERS,
  type PatentAdvancedFilters,
  type PatentFilterTab,
} from '../types/PatentsListPage.types';

const DEFAULT_SORT_BY: PatentListSortBy = 'registration_number';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

const DEFAULT_SORT_ORDER_BY_FIELD: Record<PatentListSortBy, 'asc' | 'desc'> = {
  registration_number: 'asc',
  registration_date: 'asc',
  registration_date_cir: 'asc',
  created_at: 'desc',
};

export function usePatentListFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PatentFilterTab>('all');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<PatentAdvancedFilters>(DEFAULT_PATENT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PatentAdvancedFilters>(DEFAULT_PATENT_FILTERS);
  const [sortBy, setSortBy] = useState<PatentListSortBy>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(DEFAULT_SORT_ORDER);
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

  const setSortField = useCallback((field: PatentListSortBy) => {
    setSortBy(field);
    setSortOrder(DEFAULT_SORT_ORDER_BY_FIELD[field] ?? 'asc');
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const restoreListSorting = useCallback((next: { sortBy: PatentListSortBy; sortOrder: 'asc' | 'desc' }) => {
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
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
    sortBy,
    sortOrder,
    setSortField,
    toggleSortOrder,
    restoreListSorting,
  };
}
