import type { ContractStage } from '@/types/contract';

export function applyBulkExpandCollapseForStages(
  visibleStages: ContractStage[],
  previousExpandedByStageId: Record<string, boolean>,
): Record<string, boolean> {
  const shouldCollapse = visibleStages.some(stage => previousExpandedByStageId[stage.id] !== false);
  const nextExpanded = { ...previousExpandedByStageId };
  for (const stage of visibleStages) {
    nextExpanded[stage.id] = !shouldCollapse;
  }
  return nextExpanded;
}
