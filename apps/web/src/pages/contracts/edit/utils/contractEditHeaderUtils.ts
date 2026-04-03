import dayjs from 'dayjs';

import { formatDate } from '../../../../helpers/formatDate';
import { getEntityById } from '../../../../helpers/getEntityById';
import { formReferenceId } from '../../../../helpers/formReferenceId';
import { getNameById } from '../../../../helpers/getNameById';
import type { Contract } from '../../../../types/contract';
import type { ReferenceData } from '../../../../api/hooks/useReferences';
import { getContractStateTagClass, isContractDraft, isContractSignedState } from '../../utils/contractStateUtils';

type WatchedFields = {
  number?: string;
  cipher?: string;
  name?: string;
  category_id?: string;
  contract_type_id?: string;
  state_id?: string;
  partner_id?: string;
  date_signed?: unknown;
};

type EditHeaderRefs = {
  contractStates?: ReferenceData['contractStates'];
  contractCategories?: ReferenceData['contractCategories'];
  contractTypes?: ReferenceData['contractTypes'];
  partners?: ReferenceData['partners'];
};

export function buildContractEditHeaderMeta(
  watched: WatchedFields,
  contract: Contract,
  referenceBooks: EditHeaderRefs,
) {
  const headerNumber = (watched.number ?? contract.number) || '';
  const headerCipher = (watched.cipher ?? contract.cipher) || '';
  const title = `Договор №${headerNumber || '—'}${headerCipher ? ` (${headerCipher})` : ''}`;

  const stateId = formReferenceId(watched.state_id, contract.state_id);
  const categoryId = formReferenceId(watched.category_id, contract.category_id);
  const contractTypeId = formReferenceId(watched.contract_type_id, contract.contract_type_id);
  const partnerId = formReferenceId(watched.partner_id, contract.partner_id);

  const contractState = getEntityById(stateId, referenceBooks.contractStates);
  const contractCategoryName = getNameById(categoryId, referenceBooks.contractCategories) ?? '';
  const contractTypeName = getNameById(contractTypeId, referenceBooks.contractTypes) ?? '';
  const partnerName = getNameById(partnerId, referenceBooks.partners) ?? '';
  const headerName = (watched.name ?? contract.name) || '';

  const isEffective = isContractSignedState(stateId, referenceBooks.contractStates);
  const requireFullValidation = !isContractDraft(stateId, referenceBooks.contractStates);

  const dateSignedValue = watched.date_signed ?? contract.date_signed;
  let signedDateLabel = '';
  if (dateSignedValue) {
    if (dayjs.isDayjs(dateSignedValue)) {
      signedDateLabel = dateSignedValue.format('DD.MM.YYYY');
    } else if (typeof dateSignedValue === 'string') {
      signedDateLabel = formatDate(dateSignedValue);
    }
  }

  const stateTagClass = contractState ? getContractStateTagClass(contractState.code) : null;

  return {
    title,
    headerName,
    contractState,
    stateTagClass,
    contractTypeName,
    contractCategoryName,
    partnerName,
    isEffective,
    requireFullValidation,
    signedDateLabel,
  };
}
