import type { ContractStage } from '../../../types/contract';

export const MOCK_STAGES_CONTRACT_ID = '21417402-5df5-41bd-b734-65e58442a082';

const now = new Date();
const addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r.toISOString().split('T')[0];
};

function createMockStages(responsibleId: string): ContractStage[] {
  return [
  {
    id: 'mock-stage-1',
    name: 'Подписание договора',
    stage_number: 1,
    responsible_id: responsibleId,
    contract_id: MOCK_STAGES_CONTRACT_ID,
    planned_start_date: addDays(now, -30),
    planned_end_date: addDays(now, -25),
    actual_start_date: addDays(now, -29),
    actual_end_date: addDays(now, -24),
    planned_budget: 0,
    forecasted_budget: 0,
    actual_budget: 0,
    state_id: 'mock-state-completed',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-stage-2',
    name: 'Разработка технической документации',
    stage_number: 2,
    responsible_id: responsibleId,
    contract_id: MOCK_STAGES_CONTRACT_ID,
    planned_start_date: addDays(now, -20),
    planned_end_date: addDays(now, 15),
    actual_start_date: addDays(now, -18),
    actual_end_date: '',
    planned_budget: 450_000,
    forecasted_budget: 480_000,
    actual_budget: 120_000,
    state_id: 'mock-state-in-progress',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-stage-3',
    name: 'Опытно-конструкторские работы',
    stage_number: 3,
    responsible_id: responsibleId,
    contract_id: MOCK_STAGES_CONTRACT_ID,
    planned_start_date: addDays(now, 20),
    planned_end_date: addDays(now, 90),
    actual_start_date: '',
    actual_end_date: '',
    planned_budget: 1_200_000,
    forecasted_budget: 1_200_000,
    actual_budget: 0,
    state_id: 'mock-state-planned',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-stage-4',
    name: 'Приёмка и сдача результатов',
    stage_number: 4,
    responsible_id: responsibleId,
    contract_id: MOCK_STAGES_CONTRACT_ID,
    planned_start_date: addDays(now, 95),
    planned_end_date: addDays(now, 120),
    actual_start_date: '',
    actual_end_date: '',
    planned_budget: 150_000,
    forecasted_budget: 150_000,
    actual_budget: 0,
    state_id: 'mock-state-planned',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  ];
}

/** Возвращает мок-этапы для указанного договора (только для MOCK_STAGES_CONTRACT_ID) */
export function getMockStagesForContract(contractId: string, responsibleId: string): ContractStage[] {
  if (contractId !== MOCK_STAGES_CONTRACT_ID) return [];
  return createMockStages(responsibleId);
}
