import dayjs, { type Dayjs } from 'dayjs';

import { asListNavSnapshotV1Record, parseListNavSnapshotBase } from '@/utils/listNavSnapshotShared';

import type { ProjectAdvancedFilters, ProjectEndDatePresenceFilter, ProjectFilterTab } from '../ProjectsListPage.types';

const TABS: ProjectFilterTab[] = ['all', 'active', 'completed', 'pending', 'paused', 'cancelled', 'deleted'];
function isProjectTab(candidate: unknown): candidate is ProjectFilterTab {
  return typeof candidate === 'string' && (TABS as string[]).includes(candidate);
}
function isEndPresence(candidate: unknown): candidate is ProjectEndDatePresenceFilter {
  return candidate === 'any' || candidate === 'set' || candidate === 'empty';
}
function packRange(dayjsRange: [Dayjs, Dayjs] | null): [string, string] | null {
  if (!dayjsRange?.[0] || !dayjsRange?.[1]) return null;
  return [dayjsRange[0].format('YYYY-MM-DD'), dayjsRange[1].format('YYYY-MM-DD')];
}
function unpackRange(storedRange: [string, string] | null | undefined): [Dayjs, Dayjs] | null {
  if (!storedRange?.[0] || !storedRange?.[1]) return null;
  return [dayjs(storedRange[0]), dayjs(storedRange[1])];
}

function legacyPurchaserFromSnapshot(applied: unknown): string | null {
  if (typeof applied !== 'object' || applied === null) return null;
  const rec = applied as Record<string, unknown>;
  const legacy = rec.createdById;
  return typeof legacy === 'string' ? legacy : null;
}

export type ProjectsListNavSnapshot = {
  version: 1;
  searchQuery: string;
  activeTab: ProjectFilterTab;
  applied: {
    managerId: string | null;
    purchaserId: string | null;
    overlapRange: [string, string] | null;
    startDateRange: [string, string] | null;
    endDateRange: [string, string] | null;
    endDatePresence: ProjectEndDatePresenceFilter;
  };
  page: number;
  pageSize: number;
};
export function serializeProjectsListPersistedUi(
  searchQuery: string,
  activeTab: ProjectFilterTab,
  applied: ProjectAdvancedFilters,
  page: number,
  pageSize: number,
): ProjectsListNavSnapshot {
  return {
    version: 1,
    searchQuery,
    activeTab,
    applied: {
      managerId: applied.managerId,
      purchaserId: applied.purchaserId,
      overlapRange: packRange(applied.overlapRange),
      startDateRange: packRange(applied.startDateRange),
      endDateRange: packRange(applied.endDateRange),
      endDatePresence: applied.endDatePresence,
    },
    page,
    pageSize,
  };
}
export function parseProjectsListPersistedUi(raw: unknown): {
  searchQuery: string;
  activeTab: ProjectFilterTab;
  appliedFilters: ProjectAdvancedFilters;
  page: number;
  pageSize: number;
} | null {
  const body = asListNavSnapshotV1Record(raw);
  if (!body) return null;
  const { searchQuery, page, pageSize } = parseListNavSnapshotBase(body, 20);
  const snapshotRecord = body as unknown as ProjectsListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  return {
    searchQuery,
    activeTab: isProjectTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters: {
      managerId: typeof appliedSnapshot?.managerId === 'string' ? appliedSnapshot.managerId : null,
      purchaserId:
        typeof appliedSnapshot?.purchaserId === 'string'
          ? appliedSnapshot.purchaserId
          : legacyPurchaserFromSnapshot(appliedSnapshot),
      overlapRange: unpackRange(appliedSnapshot?.overlapRange ?? null),
      startDateRange: unpackRange(appliedSnapshot?.startDateRange ?? null),
      endDateRange: unpackRange(appliedSnapshot?.endDateRange ?? null),
      endDatePresence: isEndPresence(appliedSnapshot?.endDatePresence) ? appliedSnapshot.endDatePresence : 'any',
    },
    page,
    pageSize,
  };
}
