import dayjs, { type Dayjs } from 'dayjs';

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

function snapshotFormatVersion(raw: object): number | undefined {
  const record = raw as Record<string, unknown>;
  if (typeof record.version === 'number') return record.version;
  if (typeof record.v === 'number') return record.v;
  return undefined;
}

export type ProjectsListNavSnapshot = {
  version: 1;
  searchQuery: string;
  activeTab: ProjectFilterTab;
  applied: {
    managerId: string | null;
    createdById: string | null;
    overlapRange: [string, string] | null;
    startDateRange: [string, string] | null;
    endDateRange: [string, string] | null;
    endDatePresence: ProjectEndDatePresenceFilter;
  };
  page: number;
  pageSize: number;
};
export function buildProjectsListNavSnapshot(
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
      createdById: applied.createdById,
      overlapRange: packRange(applied.overlapRange),
      startDateRange: packRange(applied.startDateRange),
      endDateRange: packRange(applied.endDateRange),
      endDatePresence: applied.endDatePresence,
    },
    page,
    pageSize,
  };
}
export function parseProjectsListNavSnapshot(raw: unknown): {
  searchQuery: string;
  activeTab: ProjectFilterTab;
  appliedFilters: ProjectAdvancedFilters;
  page: number;
  pageSize: number;
} | null {
  if (!raw || typeof raw !== 'object' || snapshotFormatVersion(raw) !== 1) return null;
  const snapshotRecord = raw as ProjectsListNavSnapshot;
  const appliedSnapshot = snapshotRecord.applied;
  const page = typeof snapshotRecord.page === 'number' && snapshotRecord.page >= 1 ? snapshotRecord.page : 1;
  const pageSize =
    typeof snapshotRecord.pageSize === 'number' && snapshotRecord.pageSize >= 1 ? snapshotRecord.pageSize : 20;
  return {
    searchQuery: typeof snapshotRecord.searchQuery === 'string' ? snapshotRecord.searchQuery : '',
    activeTab: isProjectTab(snapshotRecord.activeTab) ? snapshotRecord.activeTab : 'all',
    appliedFilters: {
      managerId: typeof appliedSnapshot?.managerId === 'string' ? appliedSnapshot.managerId : null,
      createdById: typeof appliedSnapshot?.createdById === 'string' ? appliedSnapshot.createdById : null,
      overlapRange: unpackRange(appliedSnapshot?.overlapRange ?? null),
      startDateRange: unpackRange(appliedSnapshot?.startDateRange ?? null),
      endDateRange: unpackRange(appliedSnapshot?.endDateRange ?? null),
      endDatePresence: isEndPresence(appliedSnapshot?.endDatePresence) ? appliedSnapshot.endDatePresence : 'any',
    },
    page,
    pageSize,
  };
}
