import type { ReferenceData } from '../../../../api/hooks/useReferences';

/** Режим формы договора (валидация и доступность полей). */
export type ContractFormMode = 'create' | 'edit';

/** Срез справочников для полей формы (после загрузки: `as ContractFormRefs`). */
export type ContractFormRefs = {
  partners?: ReferenceData['partners'];
  projects?: ReferenceData['projects'];
  users?: ReferenceData['users'];
  contractStates?: ReferenceData['contractStates'];
  contractCategories?: ReferenceData['contractCategories'];
  contractTypes?: ReferenceData['contractTypes'];
};
