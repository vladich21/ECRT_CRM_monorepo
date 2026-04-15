import { ContractStage } from '@/types/contract';

export type StageComputedStatus = 'planned' | 'in_progress' | 'completed' | 'overdue';
export function getStageStatusFromDates(stage: ContractStage): {
  status: StageComputedStatus;
  isCompleted: boolean;
  isInProgress: boolean;
  isDelayed: boolean;
} {
  const hasActualEndDate = Boolean(stage.actual_end_date?.trim());
  const hasActualStartDate = Boolean(stage.actual_start_date?.trim());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let plannedEnd: Date | null = null;
  if (stage.planned_end_date) {
    plannedEnd = new Date(stage.planned_end_date);
    plannedEnd.setHours(0, 0, 0, 0);
  }
  if (hasActualEndDate) {
    return { status: 'completed', isCompleted: true, isInProgress: false, isDelayed: false };
  }
  const overdueByPlan = plannedEnd !== null && plannedEnd.getTime() < today.getTime();
  if (overdueByPlan) {
    return {
      status: 'overdue',
      isCompleted: false,
      isInProgress: hasActualStartDate,
      isDelayed: true,
    };
  }
  if (hasActualStartDate) {
    return { status: 'in_progress', isCompleted: false, isInProgress: true, isDelayed: false };
  }
  return { status: 'planned', isCompleted: false, isInProgress: false, isDelayed: false };
}
export const getStageStatus = (stage: ContractStage, _contractStageStates?: any[]) => getStageStatusFromDates(stage);
type StageStateRef = {
  id: string;
  code: string;
};
export function syncContractStageStateId(stage: ContractStage, contractStageStates?: StageStateRef[]): string {
  const { status } = getStageStatusFromDates(stage);
  return (
    contractStageStates?.find(stateRef => stateRef.code === status)?.id ??
    contractStageStates?.[0]?.id ??
    stage.state_id ??
    ''
  );
}
export type StageStatusIconType = 'CheckCircleOutlined' | 'ExclamationCircleOutlined' | 'ClockCircleOutlined';
export const getStageStatusDisplay = (
  status: string,
): {
  iconType: StageStatusIconType;
  text: string;
  statusColor: string;
} => {
  const statusMap: Record<
    string,
    {
      iconType: StageStatusIconType;
      text: string;
      statusColor: string;
    }
  > = {
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
export function pluralDaysRu(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}
export type DeadlineCountdownTone = 'overdue' | 'critical' | 'urgent' | 'approaching' | 'comfortable' | 'neutral';
export function getDeadlineCountdownTone(
  daysUntilDeadline: number,
  opts: {
    isCompleted: boolean;
    isOverdue: boolean;
  },
): DeadlineCountdownTone {
  if (opts.isCompleted) return 'neutral';
  if (opts.isOverdue || daysUntilDeadline < 0) return 'overdue';
  if (daysUntilDeadline <= 1) return 'critical';
  if (daysUntilDeadline <= 3) return 'urgent';
  if (daysUntilDeadline <= 7) return 'approaching';
  if (daysUntilDeadline <= 14) return 'comfortable';
  return 'neutral';
}
export const calculateBudgetDeviation = (plannedBudget: number | null, actualBudget: number | null): number | null => {
  if (!plannedBudget || !actualBudget || actualBudget <= 0) return null;
  return ((actualBudget - plannedBudget) / plannedBudget) * 100;
};
