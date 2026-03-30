import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '../../../utils/listNavSnapshotShared';

import type { PartnerFilters } from '../PartnerFiltersModal';
import type { PartnerListTab } from '../PartnersListPage.types';

const TABS: PartnerListTab[] = ['all', 'ready', 'in_progress', 'deleted'];
function isPartnerTab(candidate: unknown): candidate is PartnerListTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
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
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize } = parseListNavSnapshotBase(body, 20);
  const snapshotRecord = body as unknown as PartnersListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  return {
    searchQuery,
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
