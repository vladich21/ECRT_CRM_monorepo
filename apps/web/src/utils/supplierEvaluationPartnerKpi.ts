import type { SupplierEvaluationListItem } from '../types/supplierEvaluation';

/** Сводка по актуальным оценкам контрагента по проектам (KPI на «Основное», реестр /partners, кэш partner-kpi). */
export type PartnerSupplierEvalKpi = {
  /** Средний балл по 5-балльной шкале матрицы: среднее арифметическое weighted_score по проектам (не «проекты / сумма»). */
  avgScore: number | null;
  /** Ближайшая дата переоценки: минимум next_reevaluation_date среди актуальных оценок, где дата задана. */
  nextReevaluationIso: string | null;
};

/** На проект оставляем одну строку — с максимальной evaluated_at (на случай дублей в данных). */
function dedupeActiveByProject(rows: SupplierEvaluationListItem[]): SupplierEvaluationListItem[] {
  const byProject = new Map<string, SupplierEvaluationListItem>();
  for (const r of rows) {
    const prev = byProject.get(r.project_id);
    if (!prev || String(r.evaluated_at) > String(prev.evaluated_at)) {
      byProject.set(r.project_id, r);
    }
  }
  return [...byProject.values()];
}

/**
 * Ожидаются только **активные** оценки (как с API `status: active`).
 * Средний балл: sum(weighted_score) / количество проектов.
 * След. переоценка: min(next_reevaluation_date) по проектам с непустой датой.
 */
export function computePartnerSupplierEvalKpi(rows: SupplierEvaluationListItem[]): PartnerSupplierEvalKpi {
  if (rows.length === 0) return { avgScore: null, nextReevaluationIso: null };
  const perProject = dedupeActiveByProject(rows);

  const sum = perProject.reduce((acc, r) => acc + Number(r.weighted_score), 0);
  const avgScore = Math.round((sum / perProject.length) * 100) / 100;

  const dates = perProject.map(r => r.next_reevaluation_date).filter((d): d is string => Boolean(d));
  const nextReevaluationIso =
    dates.length === 0 ? null : dates.reduce((a, b) => (a <= b ? a : b));

  return { avgScore, nextReevaluationIso };
}
