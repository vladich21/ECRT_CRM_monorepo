import type { SQL } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';

export type DeletedScope = 'active' | 'deleted' | 'all';

export function parseDeletedScope(raw?: string): DeletedScope {
  if (raw === 'all' || raw === 'deleted' || raw === 'active') {
    return raw;
  }
  return 'active';
}

export function sqlPartsForDeletedScope(isDeletedColumn: AnyColumn, scope: DeletedScope): SQL[] {
  if (scope === 'active') return [eq(isDeletedColumn, false)];
  if (scope === 'deleted') return [eq(isDeletedColumn, true)];
  return [];
}

export interface DeletionTabCounts {
  active: number;
  deleted: number;
  all: number;
}
