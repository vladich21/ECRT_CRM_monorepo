import type { ReferenceData } from '../../../../../../api/hooks/useReferences';
import type { ContractStage } from '../../../../../../types/contract';
import { syncContractStageStateId } from '../../stages/utils/stageHelpers';

export type MainTabStagesSyncResult =
  | { kind: 'from_api'; stages: ContractStage[] }
  | { kind: 'empty' };

export function computeMainTabStagesSync(options: {
  outletStages: ContractStage[];
  referenceBooks: Partial<ReferenceData> | undefined;
}): MainTabStagesSyncResult {
  const { outletStages, referenceBooks } = options;

  if (outletStages.length === 0) {
    return { kind: 'empty' };
  }

  const stageStates = referenceBooks?.contractStageStates;
  const stages = stageStates?.length
    ? outletStages.map(stage => ({ ...stage, state_id: syncContractStageStateId(stage, stageStates) }))
    : outletStages;

  return { kind: 'from_api', stages };
}
