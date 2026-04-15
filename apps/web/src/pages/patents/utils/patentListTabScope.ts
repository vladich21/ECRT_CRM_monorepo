import type { PatentsDeletedScope } from '@/api/patents/patentApiHooks';

import type { PatentFilterTab } from '../types/PatentsListPage.types';

export function patentListTabToDeletedScope(tab: PatentFilterTab): PatentsDeletedScope {
  if (tab === 'deleted') return 'deleted';
  return 'all';
}
