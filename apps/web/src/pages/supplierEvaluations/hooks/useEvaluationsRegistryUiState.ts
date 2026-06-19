import type { Location, NavigateFunction } from 'react-router-dom';

import { useListReturnFromDetail } from '../../../hooks/useListReturnFromDetail';
import { useRestoreToken } from '../../../hooks/useServerTablePagination';
import type { SupplierEvaluationUiStatusParam } from '../../../types/supplierEvaluation';
import type { EvaluationsRegistryAppliedFilters } from '../SupplierEvaluationsRegistryFiltersModal';
import {
  saveSupplierEvaluationsRegistryPersistedUi,
} from '../supplierEvaluationsRegistry.model';
import {
  EVALUATIONS_REGISTRY_RETURN_STATE_KEY,
  parseEvaluationsRegistryNavSnapshot,
} from '../supplierEvaluationsRegistryNavSnapshot';

type EvaluationsRegistryUiSetters = {
  setSearchInput: (value: string) => void;
  flushDebouncedSearch: (value: string) => void;
  setRowStatusTab: (tab: SupplierEvaluationUiStatusParam) => void;
  setAppliedListFilters: (filters: EvaluationsRegistryAppliedFilters) => void;
  setDraftListFilters: (filters: EvaluationsRegistryAppliedFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

/** Восстановление реестра оценок при возврате из карточки контрагента. */
export function useEvaluationsRegistryUiState(
  location: Location,
  navigate: NavigateFunction,
  setters: EvaluationsRegistryUiSetters,
) {
  const [restoreToken, bumpRestoreToken] = useRestoreToken();

  const { pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState[EVALUATIONS_REGISTRY_RETURN_STATE_KEY],
    parse: parseEvaluationsRegistryNavSnapshot,
    applyParsed: restoredListState => {
      setters.setSearchInput(restoredListState.searchQuery);
      setters.flushDebouncedSearch(restoredListState.searchQuery.trim());
      setters.setRowStatusTab(restoredListState.rowStatusTab);
      setters.setAppliedListFilters(restoredListState.appliedListFilters);
      setters.setDraftListFilters(restoredListState.appliedListFilters);
      setters.setPage(restoredListState.page);
      setters.setPageSize(restoredListState.pageSize);
      saveSupplierEvaluationsRegistryPersistedUi({
        appliedListFilters: restoredListState.appliedListFilters,
        rowStatusTab: restoredListState.rowStatusTab,
      });
      bumpRestoreToken();
    },
  });

  return { restoreToken, pendingScrollY };
}
