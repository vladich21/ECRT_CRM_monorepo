export const PARTNER_EVALUATION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export type PartnerEvaluationLetter = (typeof PARTNER_EVALUATION_LETTERS)[number];

export type PartnerProcurementFlags = {
  is_approved: boolean;
  evaluation_category: PartnerEvaluationLetter | null;
  /** Взвешенный балл той же оценки, из которой взята категория. */
  evaluation_score: number | null;
  next_reevaluation_date: string | null;
  reevaluation_overdue: boolean;
  blocked_on_project: boolean;
  warnings: string[];
};

export type PartnerProcurementCandidate = {
  partner_id: string;
  name: string;
  inn: string;
  flags: PartnerProcurementFlags;
};

export function formatPartnerDisplayName(shortName: string | null | undefined, name: string | null | undefined): string {
  const short = (shortName ?? '').trim();
  const full = (name ?? '').trim();
  return short || full || 'Контрагент';
}

export type ProjectEvaluationPick = {
  projectId: string | null;
  category: string;
  weightedScore: string | number | null;
  nextReevaluationDate: string | Date | null;
  evaluatedAt: string | Date | null;
};

const LETTER_SET = new Set<string>(PARTNER_EVALUATION_LETTERS);

export function parseEvaluationLetter(raw: string | null | undefined): PartnerEvaluationLetter | null {
  const letter = raw?.trim().toUpperCase();
  if (!letter || !LETTER_SET.has(letter)) return null;
  return letter as PartnerEvaluationLetter;
}

export function isoDateOnly(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const slice = value.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : null;
  }
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

function compareIsoDesc(left: string | Date | null | undefined, right: string | Date | null | undefined): number {
  const a = isoDateOnly(left) ?? '';
  const b = isoDateOnly(right) ?? '';
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

/** Для закупки: оценка этого проекта, иначе последняя активная project-оценка. */
export function pickProjectEvaluation(
  rows: ProjectEvaluationPick[],
  projectId: string,
): ProjectEvaluationPick | undefined {
  if (rows.length === 0) return undefined;
  const forProject = rows.filter(row => row.projectId === projectId);
  const pool = forProject.length > 0 ? forProject : rows;
  return [...pool].sort((left, right) => compareIsoDesc(left.evaluatedAt, right.evaluatedAt))[0];
}

/** numeric(5,2) приезжает из Drizzle строкой — приводим к числу с двумя знаками. */
export function parseEvaluationScore(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function buildPartnerProcurementFlags(input: {
  isApproved: boolean;
  evaluationCategory: PartnerEvaluationLetter | null;
  evaluationScore: number | null;
  nextReevaluationDate: string | null;
  blockedOnProject: boolean;
  today: string;
}): PartnerProcurementFlags {
  const reevaluationOverdue = Boolean(
    input.nextReevaluationDate && input.nextReevaluationDate < input.today,
  );
  const warnings: string[] = [];
  if (!input.isApproved) warnings.push('Контрагент не утверждён');
  if (input.evaluationCategory === 'D') warnings.push('Категория D');
  if (reevaluationOverdue) warnings.push('Просрочена переоценка');
  if (input.blockedOnProject) warnings.push('Блок по проекту закупки');
  return {
    is_approved: input.isApproved,
    evaluation_category: input.evaluationCategory,
    evaluation_score: input.evaluationScore,
    next_reevaluation_date: input.nextReevaluationDate,
    reevaluation_overdue: reevaluationOverdue,
    blocked_on_project: input.blockedOnProject,
    warnings,
  };
}
