import type { ContractStage } from '../../../../../types/contract';
import { syncContractStageStateId } from './utils/stageHelpers';

type StageStateRef = { id: string; code: string; name?: string };
type UserRef = { id: string; name: string };

export type DemoStagesRefs = {
  contractStageStates?: StageStateRef[];
  users?: UserRef[];
};

function addDaysISO(base: Date, deltaDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Наглядные мок-этапы, когда с API приходит пустой список.
 * Даты и бюджеты подобраны под фильтры «срочно», «просрочено», перерасход / экономия.
 */
export function buildDemoContractStages(contractId: string, refs: DemoStagesRefs): ContractStage[] {
  const states = refs.contractStageStates;
  const users = refs.users ?? [];
  const rid = (i: number) => {
    if (users.length === 0) return '';
    return users[i % users.length].id;
  };

  const now = new Date();
  const ts = now.toISOString();

  const row = (partial: Omit<ContractStage, 'contract_id' | 'is_archived' | 'created_at' | 'updated_at'>): ContractStage => ({
    ...partial,
    contract_id: contractId,
    is_archived: false,
    created_at: ts,
    updated_at: ts,
  });

  const list: ContractStage[] = [
    row({
      id: `demo-stage-${contractId}-1`,
      stage_number: 1,
      name: 'Подписание договора и регистрация в учёте',
      responsible_id: rid(0),
      planned_start_date: addDaysISO(now, -75),
      planned_end_date: addDaysISO(now, -48),
      actual_start_date: addDaysISO(now, -74),
      actual_end_date: addDaysISO(now, -50),
      planned_budget: 150_000,
      forecasted_budget: 145_000,
      actual_budget: 148_000,
      state_id: '',
    }),
    row({
      id: `demo-stage-${contractId}-2`,
      stage_number: 2,
      name: 'Разработка проектной и рабочей документации',
      responsible_id: rid(1),
      planned_start_date: addDaysISO(now, -22),
      planned_end_date: addDaysISO(now, 4),
      actual_start_date: addDaysISO(now, -20),
      actual_end_date: '',
      planned_budget: 420_000,
      forecasted_budget: 435_000,
      actual_budget: 210_000,
      state_id: '',
    }),
    row({
      id: `demo-stage-${contractId}-3`,
      stage_number: 3,
      name: 'Поставка оборудования на объект',
      responsible_id: rid(0),
      planned_start_date: addDaysISO(now, -40),
      planned_end_date: addDaysISO(now, -8),
      actual_start_date: addDaysISO(now, -38),
      actual_end_date: '',
      planned_budget: 890_000,
      forecasted_budget: 910_000,
      actual_budget: 0,
      state_id: '',
    }),
    row({
      id: `demo-stage-${contractId}-4`,
      stage_number: 4,
      name: 'ПНР, интеграция и пусконаладочные работы',
      responsible_id: rid(1),
      planned_start_date: addDaysISO(now, 10),
      planned_end_date: addDaysISO(now, 55),
      actual_start_date: '',
      actual_end_date: '',
      planned_budget: 310_000,
      forecasted_budget: 305_000,
      actual_budget: 0,
      state_id: '',
    }),
    row({
      id: `demo-stage-${contractId}-5`,
      stage_number: 5,
      name: 'Приёмка и закрытие договора',
      responsible_id: rid(0),
      planned_start_date: addDaysISO(now, 50),
      planned_end_date: addDaysISO(now, 80),
      actual_start_date: '',
      actual_end_date: '',
      planned_budget: 95_000,
      forecasted_budget: 92_000,
      actual_budget: 0,
      state_id: '',
    }),
    row({
      id: `demo-stage-${contractId}-6`,
      stage_number: 6,
      name: 'Сопутствующие услуги (экономия по смете)',
      responsible_id: rid(1),
      planned_start_date: addDaysISO(now, -10),
      planned_end_date: addDaysISO(now, 20),
      actual_start_date: addDaysISO(now, -8),
      actual_end_date: '',
      planned_budget: 80_000,
      forecasted_budget: 78_000,
      actual_budget: 62_000,
      state_id: '',
    }),
    row({
      id: `demo-stage-${contractId}-7`,
      stage_number: 7,
      name: 'Дополнительные работы (перерасход бюджета)',
      responsible_id: rid(0),
      planned_start_date: addDaysISO(now, -15),
      planned_end_date: addDaysISO(now, 15),
      actual_start_date: addDaysISO(now, -14),
      actual_end_date: '',
      planned_budget: 100_000,
      forecasted_budget: 118_000,
      actual_budget: 122_000,
      state_id: '',
    }),
  ];

  return list.map((s) => ({ ...s, state_id: syncContractStageStateId(s, states) }));
}
