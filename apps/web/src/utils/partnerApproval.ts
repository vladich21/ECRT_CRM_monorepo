export type PartnerCategoryKind = 'resource' | 'engineering' | 'default';

export function inferPartnerCategoryKind(categoryName: string | null | undefined): PartnerCategoryKind {
  const normalizedName = (categoryName ?? '').toLowerCase().trim();
  if (normalizedName.includes('ресурс')) return 'resource';
  if (normalizedName.includes('инжинир')) return 'engineering';
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
