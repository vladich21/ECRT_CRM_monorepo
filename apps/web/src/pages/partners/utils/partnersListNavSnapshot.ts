import type { PartnerListSortBy } from '../../../api/partners/partnerApi';
import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '../../../utils/listNavSnapshotShared';

import { EMPTY_FILTERS, type PartnerFilters } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

const TABS: PartnerListTab[] = ['all', 'ready', 'in_progress', 'deleted'];
function isPartnerTab(candidate: unknown): candidate is PartnerListTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}

const VALID_SORT_BY = new Set<PartnerListSortBy>([
  'name',
  'created_at',
  'weighted_score',
  'next_reevaluation_date',
  'status_name',
]);

function parseTriFromSnapshot(raw: unknown): PartnerFilters['isKeySupplier'] {
  if (raw === 'yes' || raw === 'no' || raw === 'all') return raw;
  return 'all';
}

function parseEvalCategories(raw: unknown): PartnerFilters['evaluationCategoryTokens'] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(['A', 'B', 'C', 'D', 'none']);
  return raw.filter((token): token is PartnerFilters['evaluationCategoryTokens'][number] => {
    return typeof token === 'string' && allowed.has(token);
  });
}

function normalizeAppliedFromSnapshot(raw: unknown): PartnerFilters {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTERS };
  const snapshot = raw as Record<string, unknown>;
  return {
    ...EMPTY_FILTERS,
    typeIds: Array.isArray(snapshot.typeIds)
      ? snapshot.typeIds.filter((id): id is string => typeof id === 'string')
      : [],
    statusIds: Array.isArray(snapshot.statusIds)
      ? snapshot.statusIds.filter((id): id is string => typeof id === 'string')
      : [],
    competenceIds: Array.isArray(snapshot.competenceIds)
      ? snapshot.competenceIds.filter((id): id is string => typeof id === 'string')
      : [],
    categoryIds: Array.isArray(snapshot.categoryIds)
      ? snapshot.categoryIds.filter((id): id is string => typeof id === 'string')
      : [],
    evaluationCategoryTokens: parseEvalCategories(snapshot.evaluationCategoryTokens),
    evaluationRequired: parseTriFromSnapshot(snapshot.evaluationRequired),
    isKeySupplier: parseTriFromSnapshot(snapshot.isKeySupplier),
    isTargeted: parseTriFromSnapshot(snapshot.isTargeted),
    reevaluationOverdue: parseTriFromSnapshot(snapshot.reevaluationOverdue),
    hasActiveBlocks: parseTriFromSnapshot(snapshot.hasActiveBlocks),
    isApproved: parseTriFromSnapshot(snapshot.isApproved),
    legalCheckPassed: parseTriFromSnapshot(snapshot.legalCheckPassed),
    questionnaireFilled: parseTriFromSnapshot(snapshot.questionnaireFilled),
    initialAssessmentDone: parseTriFromSnapshot(snapshot.initialAssessmentDone),
  };
}

export type PartnersListNavSnapshot = {
  version: 1 | 2;
  searchQuery: string;
  activeTab: PartnerListTab;
  applied: PartnerFilters;
  page: number;
  pageSize: number;
  sortBy?: PartnerListSortBy;
  sortOrder?: 'asc' | 'desc';
};

export function buildPartnersListNavSnapshot(
  searchQuery: string,
  activeTab: PartnerListTab,
  applied: PartnerFilters,
  page: number,
  pageSize: number,
  sortBy: PartnerListSortBy,
  sortOrder: 'asc' | 'desc',
): PartnersListNavSnapshot {
  return {
    version: 2,
    searchQuery,
    activeTab,
    applied: { ...applied },
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}

export function parsePartnersListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: PartnerListTab;
  appliedFilters: PartnerFilters;
  page: number;
  pageSize: number;
  sortBy: PartnerListSortBy;
  sortOrder: 'asc' | 'desc';
} | null {
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize } = parseListNavSnapshotBase(body, 20);
  const snapshotRecord = body as unknown as PartnersListNavSnapshot;
  const appliedFilters = normalizeAppliedFromSnapshot(snapshotRecord.applied);
  const sortByRaw = snapshotRecord.sortBy;
  const sortBy =
    typeof sortByRaw === 'string' && VALID_SORT_BY.has(sortByRaw as PartnerListSortBy)
      ? (sortByRaw as PartnerListSortBy)
      : 'name';
  const sortOrderRaw = snapshotRecord.sortOrder;
  const sortOrder = sortOrderRaw === 'desc' || sortOrderRaw === 'asc' ? sortOrderRaw : 'asc';
  return {
    searchQuery,
    activeTab: isPartnerTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}
