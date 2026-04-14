import type { PatentsDeletedScope } from '../../../api/patents/patentApiHooks';

import type { PatentFilterTab } from '../PatentsListPage.types';

export function patentListTabToDeletedScope(tab: PatentFilterTab): PatentsDeletedScope {
  if (tab === 'deleted') return 'deleted';
  if (tab === 'active') return 'active';
  return 'all';
}
