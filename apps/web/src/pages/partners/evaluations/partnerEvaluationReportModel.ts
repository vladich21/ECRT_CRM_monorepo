import type {
  PartnerReportEvaluation,
  SupplierEvaluationCategory,
  SupplierEvaluationCriterion,
} from '../../../types/supplierEvaluation';
import { categoryFromWeightedScore, formatEvaluatedAtRu } from './supplierEvaluationUi';

export const LOW_CRITERION_SCORE_MAX = 2;

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function truncateLabel(name: string, max = 22): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

/** Квартал по дате оценки: `2025_Q2`. */
export function quarterLabel(iso: string): string {
  const datePart = iso.slice(0, 10);
  const [year, month] = datePart.split('-').map(Number);
  if (!year || !month) return iso;
  return `${year}_Q${Math.floor((month - 1) / 3) + 1}`;
}

/** Внутри квартала - по одной (последней по дате) оценке на проект. */
function latestPerProjectInQuarter(evals: PartnerReportEvaluation[]): PartnerReportEvaluation[] {
  const byProject = new Map<string, PartnerReportEvaluation>();
  for (const evaluation of evals) {
    const key = evaluation.project_id ?? evaluation.id;
    const previous = byProject.get(key);
    if (!previous || evaluation.evaluated_at >= previous.evaluated_at) {
      byProject.set(key, evaluation);
    }
  }
  return Array.from(byProject.values());
}

export type ReportPeriodPoint = {
  key: string;
  label: string;
  evaluatedAt: string;
  overall: number;
  perCriterion: Record<string, number>;
};

/** Точки графиков: агрегация по кварталам (2025_Q2 …). */
export function buildReportPeriods(
  evaluations: PartnerReportEvaluation[],
  criteria: SupplierEvaluationCriterion[],
  _scope: string,
): ReportPeriodPoint[] {
  const byQuarter = new Map<string, PartnerReportEvaluation[]>();
  for (const evaluation of evaluations) {
    const quarter = quarterLabel(evaluation.evaluated_at);
    const bucket = byQuarter.get(quarter) ?? [];
    bucket.push(evaluation);
    byQuarter.set(quarter, bucket);
  }

  return Array.from(byQuarter.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([quarter, evalsInQuarter]) => {
      const deduped = latestPerProjectInQuarter(evalsInQuarter);
      const overall = Math.round(avg(deduped.map(e => e.weighted_score)) * 100) / 100;
      const perCriterion: Record<string, number> = {};
      for (const criterion of criteria) {
        const values = deduped.flatMap(evaluation =>
          evaluation.scores
            .filter(score => score.criterion_code === criterion.code)
            .map(score => score.score),
        );
        if (values.length) perCriterion[criterion.code] = Math.round(avg(values) * 100) / 100;
      }
      const latestDate =
        deduped
          .map(e => e.evaluated_at)
          .sort((a, b) => a.localeCompare(b))
          .at(-1) ?? '';
      return {
        key: quarter,
        label: quarter,
        evaluatedAt: latestDate,
        overall,
        perCriterion,
      };
    });
}

/** Актуальная (active) или последняя по дате оценка на каждый проект. */
export function resolveActiveEvaluationsPerProject(
  evals: PartnerReportEvaluation[],
): PartnerReportEvaluation[] {
  const byProject = new Map<string, PartnerReportEvaluation>();
  for (const evaluation of evals) {
    const key = evaluation.project_id ?? evaluation.id;
    const previous = byProject.get(key);
    if (!previous) {
      byProject.set(key, evaluation);
      continue;
    }
    const preferCurrent =
      (previous.status !== 'active' && evaluation.status === 'active') ||
      (previous.status === evaluation.status && evaluation.evaluated_at >= previous.evaluated_at);
    if (preferCurrent) byProject.set(key, evaluation);
  }
  return Array.from(byProject.values()).sort((a, b) => a.evaluated_at.localeCompare(b.evaluated_at));
}

export function filterEvaluationsByDateRange(
  evaluations: PartnerReportEvaluation[],
  dateFrom?: string | null,
  dateTo?: string | null,
  excludedDates: string[] = [],
): PartnerReportEvaluation[] {
  const excluded = new Set(excludedDates);
  return evaluations.filter(evaluation => {
    if (excluded.has(evaluation.evaluated_at)) return false;
    if (dateFrom && evaluation.evaluated_at < dateFrom) return false;
    if (dateTo && evaluation.evaluated_at > dateTo) return false;
    return true;
  });
}

export function resolveFocusEvaluation(
  evaluations: PartnerReportEvaluation[],
  scope: string,
  selectedEval: PartnerReportEvaluation | null | undefined,
): PartnerReportEvaluation | null {
  if (selectedEval) return selectedEval;
  if (scope === 'all') return null;

  const projectEvals = evaluations.filter(e => e.project_id === scope);
  const active = projectEvals.filter(e => e.status === 'active');
  const pool = active.length ? active : projectEvals;
  return pool.length ? pool[pool.length - 1] : null;
}

export type GaugeSummary = {
  value: number;
  category: SupplierEvaluationCategory;
  title: string;
  subtitle?: string;
};

export function resolveGaugeSummary(
  evaluations: PartnerReportEvaluation[],
  scope: string,
  focusEval: PartnerReportEvaluation | null,
): GaugeSummary | null {
  if (scope !== 'all') {
    if (!focusEval) return null;
    return {
      value: focusEval.weighted_score,
      category: focusEval.category ?? categoryFromWeightedScore(focusEval.weighted_score),
      title: 'Итоговая оценка',
      subtitle:
        focusEval.status === 'active'
          ? `Актуальная оценка · ${formatEvaluatedAtRu(focusEval.evaluated_at)}`
          : `Последняя оценка · ${formatEvaluatedAtRu(focusEval.evaluated_at)}`,
    };
  }

  const activePerProject = resolveActiveEvaluationsPerProject(evaluations).filter(e => e.status === 'active');
  if (!activePerProject.length) return null;

  const value = Math.round(avg(activePerProject.map(e => e.weighted_score)) * 100) / 100;
  return {
    value,
    category: categoryFromWeightedScore(value),
    title: 'Средняя актуальная оценка',
    subtitle: `По ${activePerProject.length} проект${activePerProject.length === 1 ? 'у' : 'ам'}`,
  };
}

export type RadarPoint = {
  criterion: string;
  short: string;
  score: number | null;
};

export function buildRadarData(
  criteria: SupplierEvaluationCriterion[],
  evaluations: PartnerReportEvaluation[],
  scope: string,
  focusEval: PartnerReportEvaluation | null,
): RadarPoint[] {
  if (scope !== 'all' && focusEval) {
    return criteria.map(criterion => {
      const score = focusEval.scores.find(s => s.criterion_code === criterion.code)?.score;
      return {
        criterion: criterion.name,
        short: truncateLabel(criterion.name),
        score: score ?? null,
      };
    });
  }

  const activePerProject = resolveActiveEvaluationsPerProject(evaluations).filter(e => e.status === 'active');
  return criteria.map(criterion => {
    const values = activePerProject.flatMap(evaluation =>
      evaluation.scores
        .filter(score => score.criterion_code === criterion.code)
        .map(score => score.score),
    );
    return {
      criterion: criterion.name,
      short: truncateLabel(criterion.name),
      score: values.length ? Math.round(avg(values) * 100) / 100 : null,
    };
  });
}

export function evaluationHasLowScore(evaluation: PartnerReportEvaluation): boolean {
  if (Number(evaluation.weighted_score) < 2) return true;
  return evaluation.scores.some(score => Number(score.score) <= LOW_CRITERION_SCORE_MAX);
}

export function resolveReportPeriodLabel(
  periods: ReportPeriodPoint[],
  dateFrom?: string | null,
  dateTo?: string | null,
): string {
  if (dateFrom && dateTo) {
    return `${quarterLabel(dateFrom)} - ${quarterLabel(dateTo)}`;
  }
  if (periods.length) {
    return `${periods[0].label} - ${periods[periods.length - 1].label}`;
  }
  return '-';
}

export type EvaluationDateBounds = {
  min: string;
  max: string;
};

/** Границы выбора дат в фильтре отчёта — от первой до последней оценки в охвате. */
export function resolveEvaluationDateBounds(
  evaluations: PartnerReportEvaluation[],
): EvaluationDateBounds | null {
  if (!evaluations.length) return null;

  let min = evaluations[0].evaluated_at;
  let max = evaluations[0].evaluated_at;
  for (const evaluation of evaluations) {
    if (evaluation.evaluated_at < min) min = evaluation.evaluated_at;
    if (evaluation.evaluated_at > max) max = evaluation.evaluated_at;
  }

  return { min: min.slice(0, 10), max: max.slice(0, 10) };
}
