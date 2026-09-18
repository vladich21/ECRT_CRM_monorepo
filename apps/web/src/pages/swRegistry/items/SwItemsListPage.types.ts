import type { SwItemsTabCounts } from '@/types/swRegistry';

export type SwItemsFilterTab = keyof SwItemsTabCounts;

export type SwItemsAdvancedFilters = {
  partnerId?: string;
  elementId?: string;
};

export const DEFAULT_SW_ITEMS_FILTERS: SwItemsAdvancedFilters = {};

export const SW_ITEMS_FILTER_TABS: { key: SwItemsFilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'rnd', label: 'ОКР' },
  { key: 'serial', label: 'Серийные' },
  { key: 'purchased', label: 'Покупные' },
  { key: 'archived', label: 'Архив' },
];
