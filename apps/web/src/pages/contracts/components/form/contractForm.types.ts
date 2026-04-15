import type { ReferenceData } from '@/api/hooks/useReferences';

export type ContractFormMode = 'create' | 'edit';

export type ContractFormRefs = {
  partners?: ReferenceData['partners'];
  projects?: ReferenceData['projects'];
  users?: ReferenceData['users'];
  contractStates?: ReferenceData['contractStates'];
  contractCategories?: ReferenceData['contractCategories'];
  contractTypes?: ReferenceData['contractTypes'];
};
