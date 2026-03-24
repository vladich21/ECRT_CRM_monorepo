import { MetricRow } from '../../../../../../components/ui/MetricCard';
import { getTagColorByData } from '../../../../../../helpers/getTagColorByData';
import { Contract, ContractStage } from '../../../../../../types/contract';
import { formatDate } from '../data';

const formatDateValue = (date: string | null | undefined): string => {
  return date ? formatDate(date) : '-';
};
const calculateProgress = (stages: ContractStage[]): number => {
  if (stages.length === 0) return 0;
  const completedStages = stages.filter(s => Boolean(s.actual_end_date)).length;
  return (completedStages / stages.length) * 100;
};
const calculateTotalPlannedBudget = (stages: ContractStage[]): number => {
  return stages.reduce((sum, stage) => sum + (stage.planned_budget || 0), 0);
};
const calculateTotalActualBudget = (stages: ContractStage[]): number => {
  return stages.reduce((sum, stage) => sum + (stage.actual_budget || 0), 0);
};
const calculateBudgetDeviation = (plannedBudget: number, actualBudget: number): number | null => {
  if (plannedBudget <= 0 || actualBudget <= 0) return null;
  return ((actualBudget - plannedBudget) / plannedBudget) * 100;
};
const createProgressMetric = (stages: ContractStage[]): MetricRow[] => {
  const completedStages = stages.filter(s => Boolean(s.actual_end_date)).length;
  const totalProgress = calculateProgress(stages);
  return [
    { label: 'Прогресс: ', value: `${Math.round(totalProgress)}%`, isStrong: true },
    { label: 'Этапы: ', value: `${completedStages} из ${stages.length}` },
  ];
};
const createAmountMetric = (contract: Contract): MetricRow[] => {
  return [
    {
      label: 'Сумма: ',
      value: `${contract.amount_incl_vat?.toLocaleString('ru-RU') || 0} ₽`,
      isStrong: true,
    },
    {
      label: 'Без НДС: ',
      value: `${contract.amount_excl_vat?.toLocaleString('ru-RU') || 0} ₽`,
    },
  ];
};
const createBudgetMetric = (stages: ContractStage[]): MetricRow[] => {
  const totalPlannedBudget = calculateTotalPlannedBudget(stages);
  const totalActualBudget = calculateTotalActualBudget(stages);
  const deviation = calculateBudgetDeviation(totalPlannedBudget, totalActualBudget);
  const rows: MetricRow[] = [
    { label: 'План: ', value: `${totalPlannedBudget.toLocaleString('ru-RU')} ₽`, isStrong: true },
    { label: 'Факт: ', value: `${totalActualBudget.toLocaleString('ru-RU')} ₽` },
  ];
  if (deviation !== null) {
    rows.push({
      label: 'Отклонение: ',
      value: `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`,
      className: deviation > 0 ? 'statusInactive' : 'statusActive',
    });
  }
  return rows;
};
const createDatesMetric = (contract: Contract): MetricRow[] => {
  return [
    { label: 'Окончание: ', value: formatDateValue(contract.end_date), isStrong: true },
    { label: 'Начало: ', value: formatDateValue(contract.start_date) },
  ];
};
export const createContractMetrics = (
  contract: Contract,
  stages: ContractStage[],
  referenceBooks: any,
): {
  progress: MetricRow[];
  amount: MetricRow[];
  budget: MetricRow[];
  dates: MetricRow[];
  statusData: {
    isActive: boolean;
    stateId: string | null;
    stateName: string | null;
    stateColor: string | null;
  };
} => {
  const stateEntity = contract.state_id
    ? referenceBooks.contractStates?.find((s: any) => s.id === contract.state_id)
    : null;
  return {
    progress: createProgressMetric(stages),
    amount: createAmountMetric(contract),
    budget: createBudgetMetric(stages),
    dates: createDatesMetric(contract),
    statusData: {
      isActive: contract.is_active,
      stateId: contract.state_id || null,
      stateName: stateEntity?.name || null,
      stateColor: stateEntity ? getTagColorByData(stateEntity.code) : null,
    },
  };
};
