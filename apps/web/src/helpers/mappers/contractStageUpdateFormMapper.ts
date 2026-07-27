import dayjs from 'dayjs';

import { ContractStage } from '../../types/contract';

export const contractStageUpdateFormMapper = (stageData: ContractStage) => {
  const values = {
    name: stageData.name || '',
    stage_number: stageData.stage_number || 1,
    responsible_id: stageData.responsible_id ? Number(stageData.responsible_id) : null,
    planned_start_date: stageData.planned_start_date ? dayjs(stageData.planned_start_date) : null,
    planned_end_date: stageData.planned_end_date ? dayjs(stageData.planned_end_date) : null,
    actual_start_date: stageData.actual_start_date ? dayjs(stageData.actual_start_date) : null,
    actual_end_date: stageData.actual_end_date ? dayjs(stageData.actual_end_date) : null,
    planned_budget: stageData.planned_budget || 0,
    coexecutor_budget: stageData.coexecutor_budget || 0,
    own_budget: stageData.own_budget || 0,
    forecasted_budget: stageData.forecasted_budget || 0,
    actual_budget: stageData.actual_budget || 0,
    state_id: stageData.state_id || 1,
    is_archived: stageData.is_archived || false,
  };

  return values;
};
