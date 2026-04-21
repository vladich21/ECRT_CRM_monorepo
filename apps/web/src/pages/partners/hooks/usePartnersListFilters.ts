import { useCallback, useState } from 'react';

import type { PartnerListParams, PartnerListSortBy } from '../../../api/partners/partnerApi';
import { EMPTY_FILTERS, type PartnerFilters } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

const DEFAULT_SORT_BY: PartnerListSortBy = 'name';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';
const DEFAULT_SORT_ORDER_BY_FIELD: Partial<Record<PartnerListSortBy, 'asc' | 'desc'>> = {
  created_at: 'desc',
};

function countActivePartnerFilters(filters: PartnerFilters): number {
  let count = 0;
  if (filters.typeIds.length > 0) count += 1;
  if (filters.statusIds.length > 0) count += 1;
  if (filters.competenceIds.length > 0) count += 1;
  if (filters.categoryIds.length > 0) count += 1;
  if (filters.evaluationCategoryTokens.length > 0) count += 1;
  if (filters.evaluationRequired !== 'all') count += 1;
  if (filters.isKeySupplier !== 'all') count += 1;
  if (filters.isTargeted !== 'all') count += 1;
  if (filters.reevaluationOverdue !== 'all') count += 1;
  if (filters.hasActiveBlocks !== 'all') count += 1;
  if (filters.isApproved !== 'all') count += 1;
  if (filters.legalCheckPassed !== 'all') count += 1;
  if (filters.questionnaireFilled !== 'all') count += 1;
  if (filters.initialAssessmentDone !== 'all') count += 1;
  return count;
}

export function usePartnersListFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PartnerListTab>('all');
  const [appliedFilters, setAppliedFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<PartnerListSortBy>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(DEFAULT_SORT_ORDER);

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

  const setSortField = useCallback((field: PartnerListSortBy) => {
    setSortBy(field);
    setSortOrder(DEFAULT_SORT_ORDER_BY_FIELD[field] ?? 'asc');
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const restoreListSorting = useCallback((next: Pick<PartnerListParams, 'sortBy' | 'sortOrder'>) => {
    if (next.sortBy) setSortBy(next.sortBy);
    if (next.sortOrder) setSortOrder(next.sortOrder);
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
    sortBy,
    sortOrder,
    setSortField,
    toggleSortOrder,
    restoreListSorting,
  };
}
