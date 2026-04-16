/**
 * Реестр оценок поставщиков (`/supplier-evaluations`) — единая точка для констант и чистой логики страницы.
 *
 * Поток данных (актуализировать при изменениях):
 * 1. Список строк — `GET /supplier-evaluations` (`useSupplierEvaluationsList`): проектные оценки, пагинация, фильтры модалки, вкладки ui_status.
 * 2. Счётчики вкладок — `GET /supplier-evaluations/counts-by-tab` с теми же фильтрами (без пагинации).
 * 3. Контрагенты для подписи в таблице и поиска — `GET /partners?preview=1` (`partnerApi.getPartnersForReference`): id + name; в поиске дополнительно используется `row.partner_name` из строки оценки.
 * 4. Названия проектов в таблице и в модалке переоценки — `useProjectsPreview` → `projectNameById`.
 * 5. Переоценка из реестра — `NewSupplierEvaluationModal` с `partner_id`, `initialProject_id` и `initialProjectLabel` из строки; список проектов в модалке — `GET .../partner-contract-projects` (только договоры). Если проект строки не в этом списке, в селект добавляется одна синтетическая опция с подписью из п.4 — жёлтое предупреждение «нет проектов» не показываем, если в селекте уже есть хотя бы один пункт (`shouldShowSupplierEvaluationModalNoProjectsWarning`).
 * 6. Закупщики в фильтре реестра — `GET .../registry-creators` без `partner_id`.
 */

import type { SupplierEvaluationListItem } from '../../types/supplierEvaluation';

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
