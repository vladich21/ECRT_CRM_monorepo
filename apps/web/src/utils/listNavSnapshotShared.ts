export function listNavSnapshotFormatVersion(raw: unknown): number | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  if (typeof record.version === 'number') return record.version;
  if (typeof record.v === 'number') return record.v;
  return undefined;
}

export function asListNavSnapshotV1Record(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || listNavSnapshotFormatVersion(raw) !== 1) return null;
  return raw as Record<string, unknown>;
}

export function parseListNavSnapshotBase(
  snapshotRecord: Record<string, unknown>,
  defaultPageSize: number,
): { searchQuery: string; page: number; pageSize: number } {
  return {
    searchQuery: typeof snapshotRecord.searchQuery === 'string' ? snapshotRecord.searchQuery : '',
    page: typeof snapshotRecord.page === 'number' && snapshotRecord.page >= 1 ? snapshotRecord.page : 1,
    pageSize:
      typeof snapshotRecord.pageSize === 'number' && snapshotRecord.pageSize >= 1
        ? snapshotRecord.pageSize
        : defaultPageSize,
  };
}

export type ListReturnSnapshot<TTab extends string, TApplied> = {
  version: 1;
  searchQuery: string;
  activeTab: TTab;
  applied: TApplied;
  page: number;
  pageSize: number;
};

export function makeListReturnSnapshot<TTab extends string, TApplied>(params: {
  searchQuery: string;
  activeTab: TTab;
  applied: TApplied;
  page: number;
  pageSize: number;
}): ListReturnSnapshot<TTab, TApplied> {
  return { version: 1, ...params };
}

type ReadListReturnSnapshotOpts<TTab extends string, TApplied> = {
  defaultTab: TTab;
  defaultPageSize: number;
  isTab: (value: unknown) => value is TTab;
  readApplied: (raw: unknown) => TApplied;
};

export function readListReturnSnapshot<TTab extends string, TApplied>(
  raw: unknown,
  opts: ReadListReturnSnapshotOpts<TTab, TApplied>,
): {
  searchQuery: string;
  activeTab: TTab;
  appliedFilters: TApplied;
  page: number;
  pageSize: number;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ver = r.version;
  if (ver !== 1 && ver !== 2) return null;

  const searchQuery = typeof r.searchQuery === 'string' ? r.searchQuery : '';
  const page = typeof r.page === 'number' && Number.isInteger(r.page) && r.page >= 1 ? r.page : 1;
  const pageSize =
    typeof r.pageSize === 'number' && Number.isInteger(r.pageSize) && r.pageSize >= 1
      ? r.pageSize
      : opts.defaultPageSize;

  return {
    searchQuery,
    activeTab: opts.isTab(r.activeTab) ? r.activeTab : opts.defaultTab,
    appliedFilters: opts.readApplied(r.applied),
    page,
    pageSize,
  };
}
