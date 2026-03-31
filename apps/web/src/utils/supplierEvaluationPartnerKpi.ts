import dayjs from 'dayjs';

import type { SupplierEvaluationListItem } from '../types/supplierEvaluation';

export type PartnerSupplierEvalKpi = {
  avgScore: number | null;
  nextReevaluationIso: string | null;
  blockedProjectCount: number;
  nextReevaluationOverdue: boolean;
};

function oneRowPerProject(rows: SupplierEvaluationListItem[]): SupplierEvaluationListItem[] {
  const byProject = new Map<string, SupplierEvaluationListItem>();
  for (const r of rows) {
    const prev = byProject.get(r.project_id);
    if (!prev || String(r.evaluated_at) > String(prev.evaluated_at)) {
      byProject.set(r.project_id, r);
    }
  }
  return Array.from(byProject.values());
}

export function computePartnerSupplierEvalKpi(rows: SupplierEvaluationListItem[]): PartnerSupplierEvalKpi {
  if (rows.length === 0) {
    return {
      avgScore: null,
      nextReevaluationIso: null,
      blockedProjectCount: 0,
      nextReevaluationOverdue: false,
    };
  }

  const perProject = oneRowPerProject(rows);
  const sum = perProject.reduce((acc, r) => acc + Number(r.weighted_score), 0);
  const avgScore = Math.round((sum / perProject.length) * 100) / 100;

  const dates = perProject.map(r => r.next_reevaluation_date).filter((d): d is string => Boolean(d));
  const nextReevaluationIso = dates.length === 0 ? null : dates.reduce((a, b) => (a <= b ? a : b));

  const today = dayjs().format('YYYY-MM-DD');
  const nextReevaluationOverdue =
    nextReevaluationIso != null && nextReevaluationIso.length >= 10 && nextReevaluationIso < today;

  return {
    avgScore,
    nextReevaluationIso,
    blockedProjectCount: 0,
    nextReevaluationOverdue,
  };
}
