import type { Contract, ContractStage, ContractType } from '@/types/contract';

export { formatIncomeContractLabel, toIncomeContractSelectOptions } from '@/helpers/contractLabels';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

export function isIncomeContractTypeName(name: string | null | undefined): boolean {
  return /доходн/i.test(name ?? '');
}

export function pickIncomeContracts(all: Contract[], types: ContractType[]): Contract[] {
  const active = all.filter(row => !row.is_deleted);
  const incomeTypeIds = new Set(types.filter(type => isIncomeContractTypeName(type.name)).map(type => type.id));
  if (incomeTypeIds.size === 0) return active;
  return active.filter(row => incomeTypeIds.has(row.contract_type_id));
}

export function withSelectedContract(
  list: Contract[],
  selectedId: string | null | undefined,
  extra?: Contract | null,
): Contract[] {
  if (!selectedId) return list;
  if (list.some(row => row.id === selectedId)) return list;
  if (extra?.id === selectedId) return [extra, ...list];
  return list;
}

export function parseIncomeCreatePrefill(params: { get: (key: string) => string | null }): {
  contractId?: string;
  stageId?: string;
} {
  const contractId = params.get('incomeContractId');
  const stageId = params.get('incomeStageId');
  if (!isUuid(contractId)) return {};
  return {
    contractId,
    stageId: isUuid(stageId) ? stageId : undefined,
  };
}

export function incomeCreatePath(contractId: string, stageId?: string): string {
  const params = new URLSearchParams({ incomeContractId: contractId });
  if (stageId) params.set('incomeStageId', stageId);
  return `/procurement/requests/create?${params.toString()}`;
}

export function formatIncomeStageLabel(stage: Pick<ContractStage, 'stage_number' | 'name'>): string {
  const name = stage.name?.trim() || 'Этап';
  return stage.stage_number != null ? `Этап ${stage.stage_number}. ${name}` : name;
}

export function toIncomeStageSelectOptions(stages: ContractStage[], selectedId?: string | null) {
  const options = stages
    .filter(stage => !stage.is_archived)
    .map(stage => ({
      value: stage.id,
      label: formatIncomeStageLabel(stage),
    }));
  if (selectedId && !options.some(option => option.value === selectedId)) {
    const archived = stages.find(stage => stage.id === selectedId);
    if (archived) {
      return [{ value: archived.id, label: `${formatIncomeStageLabel(archived)} (архив)` }, ...options];
    }
  }
  return options;
}
