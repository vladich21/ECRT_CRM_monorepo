import { useReferenceData, type ReferenceData } from './useReferences';

const PARTNER_REFERENCE_TYPES = [
  'partnerStatuses',
  'partnerTypes',
  'partnerCategories',
  'competencies',
] as const;

export type PartnerReferenceData = Pick<
  ReferenceData,
  (typeof PARTNER_REFERENCE_TYPES)[number]
>;

export function usePartnerReferenceData() {
  return useReferenceData([...PARTNER_REFERENCE_TYPES]);
}
