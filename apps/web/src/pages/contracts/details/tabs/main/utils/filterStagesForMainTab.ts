import type { ContractStage, ContractState } from '../../../../../../types/contract';
import { calculateBudgetDeviation, calculateDaysUntilDeadline, getStageStatus } from '../../stages/utils/stageHelpers';
import type { StageListFilters } from '../types/contractMainInfoTab.types';
export function filterAndSortStagesForMainTab(
  stages: ContractStage[],
  stageSearchRaw: string,
  filters: StageListFilters,
  contractStageStates: ContractState[] | undefined,
): ContractStage[] {
  const queryLower = stageSearchRaw.trim().toLowerCase();
  const afterSearch = queryLower
    ? stages.filter(stage => (stage.name || '').toLowerCase().includes(queryLower))
    : stages;
  const afterStatus =
    filters.status === 'all'
      ? afterSearch
      : afterSearch.filter(stage => getStageStatus(stage, contractStageStates).status === filters.status);
  const afterResponsible =
    filters.responsible === 'all'
      ? afterStatus
      : afterStatus.filter(stage => String(stage.responsible_id || '') === String(filters.responsible));
  const afterDeadline =
    filters.deadline === 'all'
      ? afterResponsible
      : afterResponsible.filter(stage => {
          const stageStatus = getStageStatus(stage, contractStageStates);
          const daysUntilDeadline = calculateDaysUntilDeadline(stage.planned_end_date || null);
          if (filters.deadline === 'overdue') return stageStatus.status === 'overdue';
          return stageStatus.status === 'in_progress' && daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
        });
  const afterBudget =
    filters.budget === 'all'
      ? afterDeadline
      : afterDeadline.filter(stage => {
          const deviation = calculateBudgetDeviation(stage.planned_budget ?? null, stage.actual_budget ?? null);
          if (deviation == null) return false;
          if (filters.budget === 'hasDeviation') return true;
          if (filters.budget === 'overBudget') return deviation > 0;
          return deviation < 0;
        });
  return [...afterBudget].sort((stageA, stageB) => stageA.stage_number - stageB.stage_number);
}
export function countActiveStageListFilters(filters: StageListFilters): number {
  return (
    Number(filters.status !== 'all') +
    Number(filters.responsible !== 'all') +
    Number(filters.deadline !== 'all') +
    Number(filters.budget !== 'all')
  );
}
