import { ReferenceData } from '@/api/hooks/useReferences';

export type ReferenceDataForPatents = Pick<
  ReferenceData,
  | 'users'
  | 'departments'
  | 'contracts'
  | 'projects'
  | 'partners'
  | 'contractCategories'
  | 'patentStatuses'
  | 'patentIntellectProps'
  | 'patentAreas'
>;
