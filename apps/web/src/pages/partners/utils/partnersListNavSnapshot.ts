import type { PartnerListSortBy } from '@/api/partners/partnerApi';
import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '@/utils/listNavSnapshotShared';

import { EMPTY_FILTERS, type PartnerFilters } from '../PartnerFiltersModal';

const VALID_SORT_BY = new Set<PartnerListSortBy>([
  'name',
  'created_at',
  'weighted_score',
  'next_reevaluation_date',
  'status_name',
]);

type LegacyPartnerListTab = 'all' | 'ready' | 'in_progress' | 'deleted';

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

function parseIsDeletedFromSnapshot(raw: unknown, wasDeletedTab: boolean): PartnerFilters['isDeleted'] {
  if (raw === 'yes' || raw === 'no' || raw === 'all') return raw;
  return wasDeletedTab ? 'yes' : 'all';
}

function applyLegacyReadinessTab(
  filters: PartnerFilters,
  legacyTab: LegacyPartnerListTab | undefined,
): PartnerFilters {
  if (filters.isApproved !== 'all') return filters;
  if (legacyTab === 'ready') return { ...filters, isApproved: 'yes' };
  if (legacyTab === 'in_progress') return { ...filters, isApproved: 'no' };
  return filters;
}

function normalizeAppliedFromSnapshot(
  raw: unknown,
  legacyTab: LegacyPartnerListTab | undefined,
): PartnerFilters {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTERS };
  const snapshot = raw as Record<string, unknown>;
  const wasDeletedTab = legacyTab === 'deleted';
  const filters: PartnerFilters = {
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
    isDeleted: parseIsDeletedFromSnapshot(snapshot.isDeleted, wasDeletedTab),
    legalCheckPassed: parseTriFromSnapshot(snapshot.legalCheckPassed),
    questionnaireFilled: parseTriFromSnapshot(snapshot.questionnaireFilled),
    initialAssessmentDone: parseTriFromSnapshot(snapshot.initialAssessmentDone),
  };
  return applyLegacyReadinessTab(filters, legacyTab);
}

/**
 * Partners v3 snapshot: filters in `applied` (not tabs), optional legacy `activeTab` in parser only.
 * Partners v3 schema in localStorage (`srn.partnersList.ui.v1`).
 */
export type PartnersListNavSnapshotV3 = {
  version: 3;
  searchQuery: string;
  applied: PartnerFilters;
  page: number;
  pageSize: number;
  sortBy?: PartnerListSortBy;
  sortOrder?: 'asc' | 'desc';
};

/** @deprecated Use PartnersListNavSnapshotV3 */
export type PartnersListNavSnapshot = PartnersListNavSnapshotV3;

export function serializePartnersListPersistedUi(
  searchQuery: string,
  applied: PartnerFilters,
  page: number,
  pageSize: number,
  sortBy: PartnerListSortBy,
  sortOrder: 'asc' | 'desc',
): PartnersListNavSnapshotV3 {
  return {
    version: 3,
    searchQuery,
    applied: { ...applied },
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}

export function parsePartnersListPersistedUi(raw: unknown): {
  searchQuery: string;
  appliedFilters: PartnerFilters;
  page: number;
  pageSize: number;
  sortBy: PartnerListSortBy;
  sortOrder: 'asc' | 'desc';
} | null {
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize } = parseListNavSnapshotBase(body, 20);
  const snapshotRecord = body as Record<string, unknown>;
  const legacyTabRaw = snapshotRecord.activeTab;
  const legacyTab =
    legacyTabRaw === 'all' ||
    legacyTabRaw === 'ready' ||
    legacyTabRaw === 'in_progress' ||
    legacyTabRaw === 'deleted'
      ? legacyTabRaw
      : undefined;
  const appliedFilters = normalizeAppliedFromSnapshot(snapshotRecord.applied, legacyTab);
  const sortByRaw = snapshotRecord.sortBy;
  const sortBy =
    typeof sortByRaw === 'string' && VALID_SORT_BY.has(sortByRaw as PartnerListSortBy)
      ? (sortByRaw as PartnerListSortBy)
      : 'name';
  const sortOrderRaw = snapshotRecord.sortOrder;
  const sortOrder = sortOrderRaw === 'desc' || sortOrderRaw === 'asc' ? sortOrderRaw : 'asc';
  return {
    searchQuery,
    appliedFilters,
    page,
    pageSize,
    sortBy,
    sortOrder,
  };
}
