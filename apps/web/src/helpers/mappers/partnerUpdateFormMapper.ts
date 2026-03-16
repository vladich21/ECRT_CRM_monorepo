import { Partner } from '../../types/partner';

export const partnerUpdateFormMapper = (partnerData: Partner) => {
  const values = {
    name: partnerData.name || '',
    short_name: partnerData.short_name || '',
    comment: partnerData.comment || '',
    status_id: partnerData.status_id || null,
    category_id: partnerData.category_id || null,
    partner_economic_category_id: partnerData.partner_economic_category_id || null,
    type_ids: partnerData.type_ids || [],
    competence_ids: partnerData.competence_ids || [],
    legal_address: partnerData.legal_address || '',
    actual_address: partnerData.actual_address || '',
    phone: partnerData.phone || '',
    email: partnerData.email || '',
    website: partnerData.website || '',
    kpp: partnerData.kpp || '',
    inn: partnerData.inn || '',
    ogrn: partnerData.ogrn || '',
    is_key_supplier: partnerData.is_key_supplier ?? false,
    is_targeted: partnerData.is_targeted ?? false,
    legal_check_passed: partnerData.legal_check_passed ?? false,
    questionnaire_filled: partnerData.questionnaire_filled ?? false,
    initial_assessment_done: partnerData.initial_assessment_done ?? false,
    rating: partnerData.rating ?? null,
    next_audit_date: partnerData.next_audit_date ?? null,
  };
  return values;
};
