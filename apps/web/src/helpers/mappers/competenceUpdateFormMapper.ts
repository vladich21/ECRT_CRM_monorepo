import { PartnerCompetence } from '../../types/partner';

export const partnerCompetenceUpdateFormMapper = (competenceData: PartnerCompetence) => {
  const values = {
    name: competenceData.name || '',
    color_bg: competenceData.color_bg || '#1890ff',
    color_text: competenceData.color_text || '#ffffff',
    color_border: competenceData.color_border || '#1890ff',
  };
  return values;
};
