// Утверждение по имени категории (ref_partner_categories.name) и флагу блокировки по оценке.
export type PartnerCategoryKind = 'resource' | 'engineering' | 'default';

export function inferPartnerCategoryKind(categoryName: string | null | undefined): PartnerCategoryKind {
  const n = (categoryName ?? '').toLowerCase().trim();
  if (n.includes('ресурс')) return 'resource';
  if (n.includes('инжинир')) return 'engineering';
  return 'default';
}

export type PartnerApprovalInputs = {
  kind: PartnerCategoryKind;
  legalCheckPassed: boolean;
  questionnaireFilled: boolean;
  initialAssessmentDone: boolean;
  hasActiveSupplierEvaluationBlock: boolean;
};

export function computePartnerIsApproved(input: PartnerApprovalInputs): boolean {
  if (input.hasActiveSupplierEvaluationBlock) return false;
  if (input.kind === 'resource') return input.legalCheckPassed;
  return input.legalCheckPassed && input.questionnaireFilled && input.initialAssessmentDone;
}
