import type { SupplierEvaluationListItem, SupplierEvaluationUiStatusParam } from '../../types/supplierEvaluation';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  type EvaluationsRegistryAppliedFilters,
} from './SupplierEvaluationsRegistryFiltersModal';
import { EVALUATION_REGISTRY_SORT_OPTIONS, EVALUATION_UI_TABS } from './supplierEvaluationsConstants';

/**
 * Реестр оценок поставщиков (`/supplier-evaluations`) — единая точка для констант и чистой логики страницы.
 *
 * Поток данных (актуализировать при изменениях):
 * 1. Список строк — `GET /supplier-evaluations` (`useSupplierEvaluationsList`): проектные оценки, пагинация, фильтры модалки, вкладки ui_status.
 * 2. Счётчики вкладок — `GET /supplier-evaluations/counts-by-tab` с теми же фильтрами (без пагинации).
 * 3. Контрагенты для подписи в таблице и поиска — `GET /partners?preview=1` (`partnerApi.getPartnersForReference`): id + name; в поиске дополнительно используется `row.partner_name` из строки оценки.
 * 4. Названия проектов в таблице и в модалке переоценки — `useProjectsPreview` → `projectNameById`.
 * 5. Переоценка из реестра — `NewSupplierEvaluationModal` с `partner_id`, `initialProject_id` и `initialProjectLabel` из строки; список проектов — `GET .../partner-contract-projects`. Текущая активная оценка по проекту подтягивается через `GET /supplier-evaluations/:id` (деталь со scores) и подставляется в матрицу/дату/комментарий. Синтетическая опция проекта и предупреждение «нет проектов» — см. `shouldShowSupplierEvaluationModalNoProjectsWarning`.
 * 6. Закупщики в фильтре реестра — `GET .../registry-creators` без `partner_id`.
 * 7. Сохранение UI реестра — `loadSupplierEvaluationsRegistryPersistedUi` / `saveSupplierEvaluationsRegistryPersistedUi` (фильтры модалки + вкладка статусов в `localStorage`).
 */

/** Дебаунс поля поиска «Контрагент или проект» на странице реестра. */
export const SUPPLIER_EVALUATIONS_REGISTRY_SEARCH_DEBOUNCE_MS = 350;

/** Сколько строк тянуть с API в режиме поиска (клиентская фильтрация по подстроке). */
export const SUPPLIER_EVALUATIONS_REGISTRY_SEARCH_FETCH_LIMIT = 2000;

/** Состояние для `Link` на карточку партнёра: кнопка «назад» с деталей ведёт в реестр оценок. */
export const SUPPLIER_EVALUATIONS_REGISTRY_PARTNER_LINK_STATE = {
  returnToAfterPartner: '/supplier-evaluations',
} as const;

/** Клиентский фильтр строк реестра по подстроке (контрагент / проект). */
export function filterSupplierEvaluationRegistryRowsBySearch(
  rows: SupplierEvaluationListItem[],
  searchTrimmed: string,
  partnerNameById: Record<string, string | undefined>,
  projectNameById: Record<string, string | number | undefined>,
): SupplierEvaluationListItem[] {
  const searchLowercase = searchTrimmed.toLowerCase();
  if (!searchLowercase) return rows;
  return rows.filter(row => {
    const refName = String(partnerNameById[row.partner_id] ?? '').trim();
    const rowName = String(row.partner_name ?? '').trim();
    const partnerMatches = [rowName, refName, row.partner_id]
      .filter(Boolean)
      .some(chunk => chunk.toLowerCase().includes(searchLowercase));
    const projectLabel = String(projectNameById[row.project_id] ?? '').toLowerCase();
    return partnerMatches || projectLabel.includes(searchLowercase);
  });
}

/**
 * Жёлтое «Нет проектов по договорам…» — только если после сборки опций в селекте «Проект» нечего выбрать.
 * Если из реестра подставлен проект (синтетическая опция), список не пустой — предупреждение не показываем.
 */
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

/** Восстановление фильтров модалки и вкладки статусов после ухода со страницы реестра. */
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
    /* ignore quota / private mode */
  }
}
