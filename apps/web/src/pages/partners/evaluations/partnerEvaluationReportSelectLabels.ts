import type { PartnerReportEvaluation } from '@/types/supplierEvaluation';
import { quarterLabel } from './partnerEvaluationReportModel';
import { formatEvaluatedAtRu } from './supplierEvaluationUi';

/** «0006 - Название…» → «0006» */
export function extractProjectCodeFromLabel(projectLabel: string): string {
  const trimmed = projectLabel.trim();
  const separatorIdx = trimmed.indexOf(' - ');
  if (separatorIdx > 0) {
    return trimmed.slice(0, separatorIdx).trim();
  }
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
}

export type ReportEvaluationSelectOption = {
  value: string;
  label: string;
  compactLabel: string;
  title: string;
  dateLabel: string;
  quarterLabel: string;
  projectLabel?: string;
};

export function buildReportEvaluationSelectOptions(
  evaluations: PartnerReportEvaluation[],
  scope: string,
): ReportEvaluationSelectOption[] {
  return evaluations.map(evaluation => {
    const dateLabel = formatEvaluatedAtRu(evaluation.evaluated_at);
    const quarter = quarterLabel(evaluation.evaluated_at);
    const projectLabel = scope === 'all' ? evaluation.project_label : undefined;
    const full = projectLabel ? `${dateLabel} · ${quarter} · ${projectLabel}` : `${dateLabel} · ${quarter}`;
    const compact =
      scope === 'all'
        ? `${dateLabel} · ${extractProjectCodeFromLabel(evaluation.project_label)}`
        : `${dateLabel} · ${quarter}`;

    return {
      value: evaluation.id,
      label: full,
      compactLabel: compact,
      title: full,
      dateLabel,
      quarterLabel: quarter,
      projectLabel,
    };
  });
}
