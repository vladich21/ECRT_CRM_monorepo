import type { Location, NavigateFunction } from 'react-router-dom';

import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { SupplierEvaluationUiStatusParam } from '@/types/supplierEvaluation';
import type { EvaluationsRegistryAppliedFilters } from '../SupplierEvaluationsRegistryFiltersModal';
import {
  loadSupplierEvaluationsRegistryPersistedUi,
  saveSupplierEvaluationsRegistryPersistedUi,
  type SupplierEvaluationsRegistryPersistedUi,
} from '../supplierEvaluationsRegistry.model';

type EvaluationsRegistryUiSetters = {
  setSearchInput: (value: string) => void;
  flushDebouncedSearch: (value: string) => void;
  setRowStatusTab: (tab: SupplierEvaluationUiStatusParam) => void;
  setAppliedListFilters: (filters: EvaluationsRegistryAppliedFilters) => void;
  setDraftListFilters: (filters: EvaluationsRegistryAppliedFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function useEvaluationsRegistryUiState(
  location: Location,
  navigate: NavigateFunction,
  setters: EvaluationsRegistryUiSetters,
  persistedUi: SupplierEvaluationsRegistryPersistedUi,
) {
  return useRegistryListUiState({
    location,
    navigate,
    load: loadSupplierEvaluationsRegistryPersistedUi,
    save: saveSupplierEvaluationsRegistryPersistedUi,
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
      setters.setSearchInput(snapshot.searchQuery);
      setters.flushDebouncedSearch(snapshot.searchQuery.trim());
      setters.setRowStatusTab(snapshot.rowStatusTab);
      setters.setAppliedListFilters(snapshot.appliedListFilters);
      setters.setDraftListFilters(snapshot.appliedListFilters);
      setters.setPage(snapshot.page);
      setters.setPageSize(snapshot.pageSize);
      bumpRestoreToken();
    },
  });
}
