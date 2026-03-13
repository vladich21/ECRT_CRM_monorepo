import type { Dayjs } from 'dayjs';
import type { ReferenceData } from '../../../api/hooks/useReferences';

export type FilterTab = 'all' | 'active' | 'draft' | 'inactive';

export type AdvancedFilters = {
  partnerId: string | null;
  categoryId: string | null;
  stateId: string | null;
  dateRange: [Dayjs, Dayjs] | null;
  amountMin: number | null;
  amountMax: number | null;
};

export type ContractListReferences = Pick<
  ReferenceData,
  'partners' | 'contractStates' | 'contractCategories'
> | null;

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  partnerId: null,
  categoryId: null,
  stateId: null,
  dateRange: null,
  amountMin: null,
  amountMax: null,
};

export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'draft', label: 'Черновики' },
  { key: 'inactive', label: 'Неактивные' },
];
