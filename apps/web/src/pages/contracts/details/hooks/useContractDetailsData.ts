import { useContractById } from '@/api/contracts/contractApiHooks';
import { useContractStages } from '@/api/contractStages/contractStagesApiHooks';
import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData, type ReferenceType } from '@/api/hooks/useReferences';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { getDaysUntilDate, shouldShowDeadlineBanner } from '@/pages/contracts/utils/contractDetailsUtils';

const REFERENCE_TYPES: ReferenceType[] = [
  'contractStates',
  'contractCategories',
  'contractTypes',
  'partners',
  'projects',
  'users',
];

export function useContractDetailsData(contractId: string) {
  const { data: contract, isLoading, isError } = useContractById(contractId);
  const { data: referenceBooks } = useReferenceData(REFERENCE_TYPES);
  const { data: contractFiles = [] } = useFilesByEntity('contract', contractId);
  const { data: stagesData } = useContractStages(contractId);

  const stages = stagesData ?? [];

  const contractState = getEntityById(contract?.state_id, referenceBooks?.contractStates);
  const contractCategoryName = getNameById(contract?.category_id, referenceBooks?.contractCategories) ?? '';
  const contractTypeName = getNameById(contract?.contract_type_id, referenceBooks?.contractTypes) ?? '';
  const partnerName = getNameById(contract?.partner_id, referenceBooks?.partners) ?? '';
  const projectEntity = getEntityById(contract?.project_id, referenceBooks?.projects);

  const daysUntilEnd = getDaysUntilDate(contract?.end_date);
  const showDeadlineBanner = shouldShowDeadlineBanner(daysUntilEnd);
  const formattedEndDate = contract?.end_date
    ? new Date(contract.end_date).toLocaleDateString('ru-RU')
    : '-';

  return {
    contract,
    referenceBooks,
    contractFiles,
    stages,
    contractState,
    contractCategoryName,
    contractTypeName,
    partnerName,
    projectEntity,
    daysUntilEnd,
    showDeadlineBanner,
    formattedEndDate,
    isLoading,
    isError,
  };
}
