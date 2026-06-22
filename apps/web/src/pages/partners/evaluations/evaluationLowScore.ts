import type { Rule } from 'antd/es/form';

/** Порог «низкого» балла по критерию (включительно). Синхронно с backend LOW_CRITERION_SCORE_MAX. */
const LOW_CRITERION_SCORE_MAX = 2;

/** Обязательный комментарий: хотя бы один критерий ≤ 2. */
export function requiresEvaluationComment(scores: readonly number[]): boolean {
  return scores.some(score => Number(score) <= LOW_CRITERION_SCORE_MAX);
}

export function getEvaluationCommentRules(requireComment: boolean): Rule[] {
  if (!requireComment) return [];
  return [
    {
      required: true,
      whitespace: true,
      message: 'При оценке 2 или ниже по критерию укажите причину и принятые меры',
    },
  ];
}
