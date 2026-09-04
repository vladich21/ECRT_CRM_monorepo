export type SwStructureFilterTab = 'active' | 'archived';

export const SW_STRUCTURE_FILTER_TABS: { key: SwStructureFilterTab; label: string }[] = [
  { key: 'active', label: 'Действующие' },
  { key: 'archived', label: 'Архивные' },
];
