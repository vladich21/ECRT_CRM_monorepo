import type { SupplierEvaluationUiStatusParam } from '../../types/supplierEvaluation';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  type EvaluationsRegistryAppliedFilters,
} from './SupplierEvaluationsRegistryFiltersModal';
import { EVALUATION_REGISTRY_SORT_OPTIONS, EVALUATION_UI_TABS } from './supplierEvaluationsConstants';

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

const VALID_UI_STATUS_TABS = new Set<string>(EVALUATION_UI_TABS.map(tab => tab.key));
const VALID_SORT_PRESET_KEYS = new Set<string>(
  EVALUATION_REGISTRY_SORT_OPTIONS.map(option => option.value),
);

export type SupplierEvaluationsRegistryPersistedUi = {
  appliedListFilters: EvaluationsRegistryAppliedFilters;
  rowStatusTab: SupplierEvaluationUiStatusParam;
};

function normalizePersistedFilters(raw: unknown): EvaluationsRegistryAppliedFilters {
  if (!raw || typeof raw !== 'object') return EMPTY_EVALUATIONS_REGISTRY_FILTERS;
  const source = raw as Record<string, unknown>;
  const years = Array.isArray(source.evaluatedYears)
    ? source.evaluatedYears.filter((y): y is string => typeof y === 'string')
    : [];
  const categoryRaw = source.category;
  const category =
    categoryRaw === 'all' || categoryRaw === 'A' || categoryRaw === 'B' || categoryRaw === 'C' || categoryRaw === 'D'
      ? categoryRaw
      : 'all';
  const createdByUserIds = Array.isArray(source.createdByUserIds)
    ? source.createdByUserIds.filter((id): id is string => typeof id === 'string')
    : [];
  const projectIds = Array.isArray(source.projectIds)
    ? source.projectIds.filter((id): id is string => typeof id === 'string')
    : [];
  const sortPresetRaw = source.sortPreset;
  const sortPreset: EvaluationsRegistryAppliedFilters['sortPreset'] =
    typeof sortPresetRaw === 'string' && VALID_SORT_PRESET_KEYS.has(sortPresetRaw)
      ? (sortPresetRaw as EvaluationsRegistryAppliedFilters['sortPreset'])
      : EMPTY_EVALUATIONS_REGISTRY_FILTERS.sortPreset;
  return { evaluatedYears: years, category, createdByUserIds, projectIds, sortPreset };
}

export function loadSupplierEvaluationsRegistryPersistedUi(): SupplierEvaluationsRegistryPersistedUi | null {
  try {
    const raw = localStorage.getItem(REGISTRY_UI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const tabRaw = record.rowStatusTab;
    const rowStatusTab =
      typeof tabRaw === 'string' && VALID_UI_STATUS_TABS.has(tabRaw)
        ? (tabRaw as SupplierEvaluationUiStatusParam)
        : 'current';
    return {
      appliedListFilters: normalizePersistedFilters(record.appliedListFilters),
      rowStatusTab,
    };
  } catch {
    return null;
  }
}

export function saveSupplierEvaluationsRegistryPersistedUi(state: SupplierEvaluationsRegistryPersistedUi): void {
  try {
    localStorage.setItem(REGISTRY_UI_STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}
