import type { ContractStage } from '../../../../../../types/contract';
import type { ReferenceData } from '../../../../../../api/hooks/useReferences';
import { buildDemoContractStages } from '../../stages/buildDemoContractStages';
import { syncContractStageStateId } from '../../stages/utils/stageHelpers';

export type MainTabStagesSyncResult =
  | { kind: 'from_api'; stages: ContractStage[] }
  | { kind: 'demo'; stages: ContractStage[]; expandedStageIds: Record<string, boolean> }
  | { kind: 'empty' };

export function computeMainTabStagesSync(options: {
  outletStages: ContractStage[];
  contractId: string | undefined;
  referenceBooks: Partial<ReferenceData> | undefined;
}): MainTabStagesSyncResult {
  const { outletStages, contractId, referenceBooks } = options;

  if (outletStages.length > 0) {
    const stageStates = referenceBooks?.contractStageStates;
    const syncedStages =
      stageStates?.length ?
        outletStages.map((stage) => ({
          ...stage,
          state_id: syncContractStageStateId(stage, stageStates),
        }))
      : outletStages;
    return { kind: 'from_api', stages: syncedStages };
  }

  if (!contractId || !referenceBooks) {
    return { kind: 'empty' };
  }

  const demoStages = buildDemoContractStages(contractId, {
    contractStageStates: referenceBooks.contractStageStates,
    users: referenceBooks.users,
  });

  return {
    kind: 'demo',
    stages: demoStages,
    expandedStageIds: Object.fromEntries(demoStages.map((stage) => [stage.id, true])),
  };
}
