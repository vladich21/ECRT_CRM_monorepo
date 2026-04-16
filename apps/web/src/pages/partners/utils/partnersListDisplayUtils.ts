import type { ReferenceData } from '../../../api/hooks/useReferences';
import type { Partner } from '../../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../../utils/partnerApproval';

export function getPartnerListDisplayName(partner: Pick<Partner, 'short_name' | 'name'>): string {
  const shortName = partner.short_name?.trim();
  if (shortName) return shortName;
  const fullName = partner.name?.trim();
  if (fullName) return fullName;
  return '—';
}

export function toPartnerListDisplayPartner(
  partner: Partner,
  references: Partial<Pick<ReferenceData, 'partnerCategories'>> | null | undefined,
): Partner {
  const categoryName =
    references?.partnerCategories?.find(category => String(category.id) === String(partner.category_id))?.name ?? null;
  const approvedByRules = computePartnerIsApproved({
    kind: inferPartnerCategoryKind(categoryName),
    legalCheckPassed: Boolean(partner.legal_check_passed),
    questionnaireFilled: Boolean(partner.questionnaire_filled),
    initialAssessmentDone: Boolean(partner.initial_assessment_done),
    hasActiveSupplierEvaluationBlock: Boolean(partner.has_active_evaluation_block),
  });
  return { ...partner, is_approved: approvedByRules };
}
