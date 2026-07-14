import {
  CRITERION_SCORE_GUIDES,
  GENERAL_SCORE_GUIDE_CODE,
} from '@/components/supplierEvaluations/criterionScoreGuides';

export type ScoreGuideStep = {
  score: number;
  label: string;
  description: string;
};

/** Общая шкала баллов (1–5) для подсказок в отчёте и формах. */
export const SUPPLIER_EVALUATION_SCORE_GUIDE: ScoreGuideStep[] = CRITERION_SCORE_GUIDES[
  GENERAL_SCORE_GUIDE_CODE
].levels.map((level) => ({
  score: level.score,
  label: level.label,
  description: level.lines[0] ?? '',
}));
