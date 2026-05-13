import type { ReferenceData } from '../../../../api/hooks/useReferences';
import type { Partner } from '../../../../types/partner';

export type PartnerFormRefs = {
  partnerCategories?: ReferenceData['partnerCategories'];
  partnerTypes?: ReferenceData['partnerTypes'];
  partnerStatuses?: ReferenceData['partnerStatuses'];
  competencies?: ReferenceData['competencies'];
  partnerEconomicCategories?: ReferenceData['partnerEconomicCategories'];
};

export type PartnerFormSubmitValues = Partial<Partner> & {
  manual_archive?: boolean;
  manual_active?: boolean;
};
