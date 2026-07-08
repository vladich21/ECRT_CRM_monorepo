import { useReferenceData, type ReferenceData, type UseReferenceDataOptions } from './useReferences';

const CONTRACT_REFERENCE_TYPES = [
  'partners',
  'contractStates',
  'contractCategories',
  'contractTypes',
  'projects',
  'users',
  'contractStageStates',
] as const;

export type ContractReferenceData = Pick<
  ReferenceData,
  (typeof CONTRACT_REFERENCE_TYPES)[number]
>;

export function useContractReferenceData(options?: UseReferenceDataOptions) {
  return useReferenceData([...CONTRACT_REFERENCE_TYPES], options);
}
