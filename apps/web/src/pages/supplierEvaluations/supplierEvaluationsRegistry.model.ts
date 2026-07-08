import type { SupplierEvaluationUiStatusParam } from '../../types/supplierEvaluation';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  type EvaluationsRegistryAppliedFilters,
} from './SupplierEvaluationsRegistryFiltersModal';
import {
  parseEvaluationsRegistryPersistedUi,
  serializeEvaluationsRegistryPersistedUi,
} from './supplierEvaluationsRegistryNavSnapshot';

export const SUPPLIER_EVALUATIONS_REGISTRY_SEARCH_DEBOUNCE_MS = 350;

export const SUPPLIER_EVALUATIONS_REGISTRY_PARTNER_LINK_STATE = {
  returnToAfterPartner: '/supplier-evaluations',
} as const;

export function shouldShowSupplierEvaluationModalNoProjectsWarning(
  projectsLoading: boolean,
  projectSelectOptionsLength: number,
): boolean {
  if (projectsLoading) return false;
  return projectSelectOptionsLength === 0;
}

const REGISTRY_UI_STORAGE_KEY = 'srn.supplierEvaluationsRegistry.ui.v1';

export type SupplierEvaluationsRegistryPersistedUi = NonNullable<
  ReturnType<typeof parseEvaluationsRegistryPersistedUi>
>;

export function loadSupplierEvaluationsRegistryPersistedUi(): SupplierEvaluationsRegistryPersistedUi | null {
  try {
    const raw = localStorage.getItem(REGISTRY_UI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const fromSnapshot = parseEvaluationsRegistryPersistedUi(parsed);
    if (fromSnapshot) return fromSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (!('appliedListFilters' in record) && !('rowStatusTab' in record)) return null;
    return {
      searchQuery: '',
      rowStatusTab:
        typeof record.rowStatusTab === 'string'
          ? (record.rowStatusTab as SupplierEvaluationUiStatusParam)
          : 'current',
      appliedListFilters:
        record.appliedListFilters && typeof record.appliedListFilters === 'object'
          ? (record.appliedListFilters as EvaluationsRegistryAppliedFilters)
          : EMPTY_EVALUATIONS_REGISTRY_FILTERS,
      page: 1,
      pageSize: 20,
    };
  } catch {
    return null;
  }
}

export function saveSupplierEvaluationsRegistryPersistedUi(params: {
  searchQuery: string;
  rowStatusTab: SupplierEvaluationUiStatusParam;
  appliedListFilters: EvaluationsRegistryAppliedFilters;
  page: number;
  pageSize: number;
}): void {
  try {
    const snapshot = serializeEvaluationsRegistryPersistedUi(
      params.searchQuery,
      params.rowStatusTab,
      params.appliedListFilters,
      params.page,
      params.pageSize,
    );
    localStorage.setItem(REGISTRY_UI_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function evaluationsRegistryFiltersResetKey(filters: EvaluationsRegistryAppliedFilters): string {
  return JSON.stringify({
    evaluatedYears: [...filters.evaluatedYears].sort(),
    category: filters.category,
    createdByUserIds: [...filters.createdByUserIds].sort(),
    projectIds: [...filters.projectIds].sort(),
    sortPreset: filters.sortPreset,
  });
}

export function buildEvaluationsRegistryQueryResetKey(params: {
  rowStatusTab: SupplierEvaluationUiStatusParam;
  debouncedSearch: string;
  appliedListFilters: EvaluationsRegistryAppliedFilters;
}): string {
  return JSON.stringify({
    tab: params.rowStatusTab,
    search: params.debouncedSearch.trim(),
    filters: evaluationsRegistryFiltersResetKey(params.appliedListFilters),
  });
}

/** Ключ запроса списка оценок на вкладке контрагента (без page). */
export function buildPartnerEvaluationsListQueryResetKey(params: {
  partnerId: string;
  rowStatusTab: SupplierEvaluationUiStatusParam;
  appliedListFilters: EvaluationsRegistryAppliedFilters;
}): string {
  return JSON.stringify({
    partnerId: params.partnerId,
    tab: params.rowStatusTab,
    filters: evaluationsRegistryFiltersResetKey(params.appliedListFilters),
  });
}
