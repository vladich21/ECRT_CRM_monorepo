import { EMPTY_FILTERS, type PartnerFilters } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

const TABS: PartnerListTab[] = ['all', 'ready', 'in_progress', 'deleted'];
function isPartnerTab(candidate: unknown): candidate is PartnerListTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}

function snapshotFormatVersion(raw: object): number | undefined {
  const record = raw as Record<string, unknown>;
  if (typeof record.version === 'number') return record.version;
  if (typeof record.v === 'number') return record.v;
  return undefined;
}

export type PartnersListNavSnapshot = {
  version: 1;
  searchQuery: string;
  activeTab: PartnerListTab;
  applied: PartnerFilters;
  page: number;
  pageSize: number;
};
export function buildPartnersListNavSnapshot(
  searchQuery: string,
  activeTab: PartnerListTab,
  applied: PartnerFilters,
  page: number,
  pageSize: number,
): PartnersListNavSnapshot {
  return {
    version: 1,
    searchQuery,
    activeTab,
    applied: {
      typeIds: [...applied.typeIds],
      statusIds: [...applied.statusIds],
      competenceIds: [...applied.competenceIds],
    },
    page,
    pageSize,
  };
}
export function parsePartnersListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: PartnerListTab;
  appliedFilters: PartnerFilters;
  page: number;
  pageSize: number;
} | null {
  if (!raw || typeof raw !== 'object' || snapshotFormatVersion(raw) !== 1) return null;
  const snapshotRecord = raw as PartnersListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  const page = typeof snapshotRecord.page === 'number' && snapshotRecord.page >= 1 ? snapshotRecord.page : 1;
  const pageSize =
    typeof snapshotRecord.pageSize === 'number' && snapshotRecord.pageSize >= 1 ? snapshotRecord.pageSize : 20;
  return {
    searchQuery: typeof snapshotRecord.searchQuery === 'string' ? snapshotRecord.searchQuery : '',
    activeTab: isPartnerTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters: {
      typeIds: Array.isArray(appliedSnapshot?.typeIds)
        ? appliedSnapshot.typeIds.filter((id): id is string => typeof id === 'string')
        : [],
      statusIds: Array.isArray(appliedSnapshot?.statusIds)
        ? appliedSnapshot.statusIds.filter((id): id is string => typeof id === 'string')
        : [],
      competenceIds: Array.isArray(appliedSnapshot?.competenceIds)
        ? appliedSnapshot.competenceIds.filter((id): id is string => typeof id === 'string')
        : [],
    },
    page,
    pageSize,
  };
}
