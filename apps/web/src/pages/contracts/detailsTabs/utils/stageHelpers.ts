import { ContractStage } from '../../../../types/contract';
import { getEntityById } from '../../../../helpers/getEntityById';

export const getStageStatus = (stage: ContractStage, contractStageStates?: any[]) => {
  const hasActualEndDate = Boolean(stage.actual_end_date);
  const hasActualStartDate = Boolean(stage.actual_start_date);
  const stageState = getEntityById(stage.state_id, contractStageStates);
  const stateCode = stageState?.code || 'planned';

  const isCompleted = stateCode === 'completed' || hasActualEndDate;
  const isInProgress = stateCode === 'in_progress' || (hasActualStartDate && !hasActualEndDate);
  const isDelayed = stateCode === 'overdue' || (stage.planned_end_date && new Date(stage.planned_end_date) < new Date() && !isCompleted);

  let status = 'planned';
  if (isCompleted) status = 'completed';
  else if (isDelayed) status = 'overdue';
  else if (isInProgress) status = 'in_progress';
  else if (stateCode) status = stateCode;

  return { status, isCompleted, isInProgress, isDelayed };
};

export type StageStatusIconType = 'CheckCircleOutlined' | 'ExclamationCircleOutlined' | 'ClockCircleOutlined';

export const getStageStatusDisplay = (status: string): {
  iconType: StageStatusIconType;
  text: string;
  statusColor: string;
} => {
  const statusMap: Record<string, { iconType: StageStatusIconType; text: string; statusColor: string }> = {
    completed: {
      iconType: 'CheckCircleOutlined',
      text: 'Завершен',
      statusColor: '#54B128',
    },
    overdue: {
      iconType: 'ExclamationCircleOutlined',
      text: 'Просрочен',
      statusColor: '#D32F2F',
    },
    in_progress: {
      iconType: 'ClockCircleOutlined',
      text: 'В работе',
      statusColor: '#001529',
    },
    planned: {
      iconType: 'ClockCircleOutlined',
      text: 'Запланирован',
      statusColor: '#A6A6A6',
    },
  };

  return statusMap[status] || statusMap.planned;
};

export const calculateDaysUntilDeadline = (plannedEndDate: string | null): number => {
  if (!plannedEndDate) return 0;
  const plannedEnd = new Date(plannedEndDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  plannedEnd.setHours(0, 0, 0, 0);
  return Math.ceil((plannedEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const calculateBudgetDeviation = (plannedBudget: number | null, actualBudget: number | null): number | null => {
  if (!plannedBudget || !actualBudget || actualBudget <= 0) return null;
  return ((actualBudget - plannedBudget) / plannedBudget) * 100;
};
