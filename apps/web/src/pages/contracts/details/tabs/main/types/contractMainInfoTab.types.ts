import type { Contract, ContractStage } from '../../../../../../types/contract';

export type ContractMainInfoOutletContext = {
  contract: Contract;
  stages: ContractStage[];
};
export type StageListFilters = {
  status: 'all' | 'planned' | 'in_progress' | 'completed' | 'overdue';
  responsible: string | 'all';
  deadline: 'all' | 'urgent' | 'overdue';
  budget: 'all' | 'hasDeviation' | 'overBudget' | 'underBudget';
};
export const DEFAULT_STAGE_LIST_FILTERS: StageListFilters = {
  status: 'all',
  responsible: 'all',
  deadline: 'all',
  budget: 'all',
};
export type ContractMainInfoUiState = {
  isExpanded: boolean;
  expandedStageIds: Record<string, boolean>;
  isAddStageOpen: boolean;
  editingStageId: string | null;
  isFiltersOpen: boolean;
  stageSearch: string;
};
export const INITIAL_CONTRACT_MAIN_INFO_UI: ContractMainInfoUiState = {
  isExpanded: true,
  expandedStageIds: {},
  isAddStageOpen: false,
  editingStageId: null,
  isFiltersOpen: false,
  stageSearch: '',
};
