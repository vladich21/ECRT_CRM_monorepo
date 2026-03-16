import { ReferenceData } from '../../api/hooks/useReferences';

export type ReferenceDataForPatents = Pick<
  ReferenceData,
  'users' | 'departments' | 'contracts' | 'projects' | 'contractCategories' | 'patentStatuses' | 'patentIntellectProps'
>;
