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
