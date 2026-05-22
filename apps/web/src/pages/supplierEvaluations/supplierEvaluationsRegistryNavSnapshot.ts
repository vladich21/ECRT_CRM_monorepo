import type { SupplierEvaluationUiStatusParam } from '../../types/supplierEvaluation';
import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '../../utils/listNavSnapshotShared';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  type EvaluationsRegistryAppliedFilters,
} from './SupplierEvaluationsRegistryFiltersModal';
import { EVALUATION_REGISTRY_SORT_OPTIONS, EVALUATION_UI_TABS } from './supplierEvaluationsConstants';

export const EVALUATIONS_REGISTRY_RETURN_STATE_KEY = 'evaluationsRegistryReturn';

const VALID_UI_STATUS_TABS = new Set<string>(EVALUATION_UI_TABS.map(tab => tab.key));
const VALID_SORT_PRESET_KEYS = new Set<string>(
  EVALUATION_REGISTRY_SORT_OPTIONS.map(option => option.value),
);

export type EvaluationsRegistryNavSnapshot = {
  version: 1;
  searchQuery: string;
  rowStatusTab: SupplierEvaluationUiStatusParam;
  applied: EvaluationsRegistryAppliedFilters;
  page: number;
  pageSize: number;
  scrollY?: number;
};

function normalizeAppliedFilters(raw: unknown): EvaluationsRegistryAppliedFilters {
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

export function buildEvaluationsRegistryNavSnapshot(
  searchQuery: string,
  rowStatusTab: SupplierEvaluationUiStatusParam,
  applied: EvaluationsRegistryAppliedFilters,
  page: number,
  pageSize: number,
  scrollY?: number,
): EvaluationsRegistryNavSnapshot {
  return {
    version: 1,
    searchQuery,
    rowStatusTab,
    applied: { ...applied },
    page,
    pageSize,
    scrollY,
  };
}

export function parseEvaluationsRegistryNavSnapshot(raw: unknown): {
  searchQuery: string;
  rowStatusTab: SupplierEvaluationUiStatusParam;
  appliedListFilters: EvaluationsRegistryAppliedFilters;
  page: number;
  pageSize: number;
  scrollY?: number;
} | null {
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize, scrollY } = parseListNavSnapshotBase(body, 20);
  const snapshot = body as unknown as EvaluationsRegistryNavSnapshot;
  const tabRaw = snapshot.rowStatusTab;
  const rowStatusTab =
    typeof tabRaw === 'string' && VALID_UI_STATUS_TABS.has(tabRaw)
      ? (tabRaw as SupplierEvaluationUiStatusParam)
      : 'current';
  return {
    searchQuery,
    rowStatusTab,
    appliedListFilters: normalizeAppliedFilters(snapshot.applied),
    page,
    pageSize,
    scrollY,
  };
}
