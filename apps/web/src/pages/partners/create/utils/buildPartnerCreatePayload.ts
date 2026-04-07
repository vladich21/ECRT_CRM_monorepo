import type { ReferenceData } from '../../../../api/hooks/useReferences';
import type { Partner } from '../../../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../../../utils/partnerApproval';
import type { PartnerFormSubmitValues } from '../../components/form';

export function buildPartnerCreatePayload(
  values: PartnerFormSubmitValues,
  referenceBooks: Partial<Pick<ReferenceData, 'partnerCategories'>>,
): Partner {
  const categoryName =
    referenceBooks.partnerCategories?.find(category => String(category.id) === String(values.category_id))?.name ??
    null;
  return {
    ...values,
    manual_archive: Boolean(values.manual_archive),
    type_ids: values.type_ids || [],
    competence_ids: values.competence_ids || [],
    partner_economic_category_id: values.partner_economic_category_id,
    is_approved: computePartnerIsApproved({
      kind: inferPartnerCategoryKind(categoryName),
      legalCheckPassed: Boolean(values.legal_check_passed),
      questionnaireFilled: Boolean(values.questionnaire_filled),
      initialAssessmentDone: Boolean(values.initial_assessment_done),
      hasActiveSupplierEvaluationBlock: false,
    }),
  } as Partner;
}
