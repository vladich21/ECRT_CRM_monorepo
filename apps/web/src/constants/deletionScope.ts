export type DeletionScope = 'active' | 'deleted' | 'all';
export const DELETION_SCOPE_TABS: {
  key: DeletionScope;
  label: string;
}[] = [
  { key: 'active', label: 'Активные' },
  { key: 'deleted', label: 'Удалённые' },
  { key: 'all', label: 'Все записи' },
];
export type DeletionTabCounts = {
  active: number;
  deleted: number;
  all: number;
};
export const EMPTY_DELETION_TAB_COUNTS: DeletionTabCounts = {
  active: 0,
  deleted: 0,
  all: 0,
};
