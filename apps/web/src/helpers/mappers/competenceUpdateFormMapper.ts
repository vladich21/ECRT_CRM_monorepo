import { PartnerCompetence } from '../../types/partner';

export const partnerCompetenceUpdateFormMapper = (competenceData: PartnerCompetence) => ({
  name: competenceData.name || '',
});
