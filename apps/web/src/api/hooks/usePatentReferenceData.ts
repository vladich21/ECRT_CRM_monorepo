import { useReferenceData, type ReferenceData, type UseReferenceDataOptions } from './useReferences';

const PATENT_REFERENCE_TYPES = [
  'departments',
  'users',
  'contracts',
  'projects',
  'partners',
  'contractCategories',
  'patentStatuses',
  'patentIntellectProps',
  'patentAreas',
] as const;

export type PatentReferenceData = Pick<
  ReferenceData,
  (typeof PATENT_REFERENCE_TYPES)[number]
>;

export function usePatentReferenceData(options?: UseReferenceDataOptions) {
  return useReferenceData([...PATENT_REFERENCE_TYPES], options);
}
