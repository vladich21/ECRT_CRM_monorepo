import type {
  InitialSupplierEvaluation,
  PartnerEvaluationReport,
  PartnerReportEvaluation,
  PartnerReportScore,
  SupplierEvaluationBlock,
  SupplierEvaluationDetail,
  SupplierEvaluationScoreDetail,
  SupplierEvaluationStatus,
} from '../../../../types/supplierEvaluation';

export type PartnerEvaluationsExportFilter = {
  projectIds?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  includeArchived: boolean;
  includeInitial: boolean;
};

export type PartnerEvaluationsExportContext = {
  partnerName: string;
  partnerStatusName: string;
  report: PartnerEvaluationReport;
  blocks: SupplierEvaluationBlock[];
  initial?: {
    record: InitialSupplierEvaluation;
    detail: SupplierEvaluationDetail | null;
  } | null;
};

export type PartnerEvalExportColumn = {
  key: string;
  header: string;
  numeric?: boolean;
};

export type PartnerEvalExportSheet = {
  sheetName: string;
  columns: PartnerEvalExportColumn[];
  rows: string[][];
};

type ExportCriterionMeta = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

type ScoreLike = {
  criterion_id: string;
  criterion_code?: string;
  criterion_name?: string;
  sort_order?: number;
  score: number;
};

function formatYesNo(value: boolean): string {
  return value ? 'Да' : 'Нет';
}

function formatEvalStatus(status: SupplierEvaluationStatus): string {
  return status === 'active' ? 'Актуальная' : 'Архив';
}

function formatIsoDateDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split('-');
  return `${d}.${m}.${y}`;
}

function formatBlockReason(reason: string): string {
  if (reason === 'manual') return 'Ручная блокировка (историческая)';
  if (reason === 'evaluation_category_d') return 'Автоматически по категории D';
  return reason || '';
}

function inDateRange(evaluatedAt: string, dateFrom?: string | null, dateTo?: string | null): boolean {
  const day = (evaluatedAt ?? '').slice(0, 10);
  if (!day) return !dateFrom && !dateTo;
  if (dateFrom && day < dateFrom.slice(0, 10)) return false;
  if (dateTo && day > dateTo.slice(0, 10)) return false;
  return true;
}

function scoreByCriterionId(scores: ScoreLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const score of scores) {
    map.set(score.criterion_id, score.score);
  }
  return map;
}

function criterionHeader(meta: ExportCriterionMeta): string {
  return meta.name.trim() || meta.code.trim() || meta.id;
}

function collectCriteriaFromScores(scoreLists: ScoreLike[][]): ExportCriterionMeta[] {
  const byId = new Map<string, ExportCriterionMeta>();

  for (const scores of scoreLists) {
    for (const score of scores) {
      const id = score.criterion_id;
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        code: score.criterion_code?.trim() ?? '',
        name: score.criterion_name?.trim() ?? '',
        sortOrder: Number.isFinite(Number(score.sort_order)) ? Number(score.sort_order) : 0,
      });
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const byName = criterionHeader(a).localeCompare(criterionHeader(b), 'ru');
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}

function filterProjectEvaluations(
  evaluations: PartnerReportEvaluation[],
  filter: PartnerEvaluationsExportFilter,
): PartnerReportEvaluation[] {
  const projectSet =
    filter.projectIds && filter.projectIds.length > 0 ? new Set(filter.projectIds) : null;

  return evaluations
    .filter(evaluation => {
      if (!filter.includeArchived && evaluation.status !== 'active') return false;
      if (projectSet && (!evaluation.project_id || !projectSet.has(evaluation.project_id))) {
        return false;
      }
      return inDateRange(evaluation.evaluated_at, filter.dateFrom, filter.dateTo);
    })
    .sort((a, b) => {
      const byDate = a.evaluated_at.localeCompare(b.evaluated_at);
      if (byDate !== 0) return byDate;
      return a.project_label.localeCompare(b.project_label, 'ru');
    });
}

function initialScoresForExport(
  detail: SupplierEvaluationDetail | null | undefined,
): ScoreLike[] {
  const scores = detail?.scores ?? [];
  return scores.map((score: SupplierEvaluationScoreDetail) => ({
    criterion_id: score.criterion_id,
    criterion_code: score.criterion_code,
    criterion_name: score.criterion_name,
    sort_order: score.sort_order,
    score: score.score,
  }));
}

function includeInitialInExport(
  filter: PartnerEvaluationsExportFilter,
  initial: PartnerEvaluationsExportContext['initial'],
): boolean {
  if (!filter.includeInitial || !initial?.record) return false;
  const record = initial.record;
  if (!filter.includeArchived && record.status !== 'active') return false;
  return inDateRange(record.evaluated_at, filter.dateFrom, filter.dateTo);
}

function buildEvaluationColumns(criteria: ExportCriterionMeta[]): PartnerEvalExportColumn[] {
  const fixed: PartnerEvalExportColumn[] = [
    { key: 'partner', header: 'Контрагент' },
    { key: 'project', header: 'Проект' },
    { key: 'evaluated_at', header: 'Дата оценки' },
    { key: 'eval_status', header: 'Статус оценки' },
    { key: 'category', header: 'Категория' },
    { key: 'weighted_score', header: 'Итоговый балл', numeric: true },
    { key: 'next_reevaluation_date', header: 'Дата переоценки' },
    { key: 'comment', header: 'Комментарий' },
  ];

  const criterionCols: PartnerEvalExportColumn[] = criteria.map(criterion => ({
    key: `criterion_${criterion.id}`,
    header: criterionHeader(criterion),
    numeric: true,
  }));

  return [
    ...fixed,
    ...criterionCols,
    { key: 'project_blocked', header: 'Блокировка по проекту' },
    { key: 'partner_status', header: 'Статус контрагента' },
  ];
}

function buildEvaluationRow(
  columns: PartnerEvalExportColumn[],
  ctx: {
    partnerName: string;
    partnerStatusName: string;
    projectLabel: string;
    evaluatedAt: string;
    status: SupplierEvaluationStatus;
    category: string;
    weightedScore: number;
    nextReevaluationDate: string | null | undefined;
    comment: string | null | undefined;
    scores: Map<string, number>;
    projectBlocked: boolean | null;
  },
): string[] {
  return columns.map(column => {
    switch (column.key) {
      case 'partner':
        return ctx.partnerName;
      case 'project':
        return ctx.projectLabel;
      case 'evaluated_at':
        return formatIsoDateDisplay(ctx.evaluatedAt);
      case 'eval_status':
        return formatEvalStatus(ctx.status);
      case 'category':
        return ctx.category;
      case 'weighted_score':
        return Number.isFinite(ctx.weightedScore) ? String(ctx.weightedScore) : '';
      case 'next_reevaluation_date':
        return formatIsoDateDisplay(ctx.nextReevaluationDate);
      case 'comment':
        return (ctx.comment ?? '').trim();
      case 'project_blocked':
        return ctx.projectBlocked == null ? '' : formatYesNo(ctx.projectBlocked);
      case 'partner_status':
        return ctx.partnerStatusName;
      default: {
        if (column.key.startsWith('criterion_')) {
          const criterionId = column.key.slice('criterion_'.length);
          const score = ctx.scores.get(criterionId);
          return score == null || !Number.isFinite(score) ? '' : String(score);
        }
        return '';
      }
    }
  });
}

export function buildPartnerEvaluationsExportSheets(
  ctx: PartnerEvaluationsExportContext,
  filter: PartnerEvaluationsExportFilter,
): PartnerEvalExportSheet[] {
  const projectEvals = filterProjectEvaluations(ctx.report.evaluations ?? [], filter);
  const withInitial = includeInitialInExport(filter, ctx.initial);
  const initialScores = withInitial ? initialScoresForExport(ctx.initial?.detail) : [];

  const criteria = collectCriteriaFromScores([
    ...projectEvals.map(evaluation => evaluation.scores as PartnerReportScore[]),
    ...(withInitial ? [initialScores] : []),
  ]);
  const columns = buildEvaluationColumns(criteria);

  const blockedProjectIds = new Set(
    (ctx.blocks ?? []).filter(block => block.is_active).map(block => block.project_id),
  );

  const evalRows: string[][] = projectEvals.map(evaluation =>
    buildEvaluationRow(columns, {
      partnerName: ctx.partnerName,
      partnerStatusName: ctx.partnerStatusName,
      projectLabel: evaluation.project_label || '-',
      evaluatedAt: evaluation.evaluated_at,
      status: evaluation.status,
      category: evaluation.category,
      weightedScore: Number(evaluation.weighted_score),
      nextReevaluationDate: evaluation.next_reevaluation_date,
      comment: evaluation.comment,
      scores: scoreByCriterionId(evaluation.scores ?? []),
      projectBlocked: evaluation.project_id ? blockedProjectIds.has(evaluation.project_id) : null,
    }),
  );

  if (withInitial && ctx.initial?.record) {
    const initial = ctx.initial.record;
    evalRows.push(
      buildEvaluationRow(columns, {
        partnerName: ctx.partnerName,
        partnerStatusName: ctx.partnerStatusName,
        projectLabel: 'Первичная оценка',
        evaluatedAt: initial.evaluated_at,
        status: initial.status,
        category: initial.category,
        weightedScore: Number(initial.weighted_score),
        nextReevaluationDate: initial.next_reevaluation_date,
        comment: initial.comment,
        scores: scoreByCriterionId(initialScores),
        projectBlocked: null,
      }),
    );
  }

  const projectSet =
    filter.projectIds && filter.projectIds.length > 0 ? new Set(filter.projectIds) : null;
  const projectLabelById = new Map(ctx.report.projects.map(project => [project.id, project.label]));

  const blockColumns: PartnerEvalExportColumn[] = [
    { key: 'project', header: 'Проект' },
    { key: 'reason', header: 'Причина' },
    { key: 'created_at', header: 'Дата создания' },
  ];

  const blockRows = (ctx.blocks ?? [])
    .filter(block => block.is_active)
    .filter(block => !projectSet || projectSet.has(block.project_id))
    .map(block => [
      projectLabelById.get(block.project_id) ?? block.project_id,
      formatBlockReason(block.reason),
      formatIsoDateDisplay(block.created_at?.slice(0, 10)),
    ]);

  return [
    {
      sheetName: 'Оценки',
      columns,
      rows: evalRows,
    },
    {
      sheetName: 'Блокировки',
      columns: blockColumns,
      rows: blockRows,
    },
  ];
}

export function buildPartnerEvaluationsExportFilePrefix(partnerName: string, inn?: string | null): string {
  const raw = (partnerName || inn || 'kontragent').trim() || 'kontragent';
  const safe = raw
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60);
  return `ocenki_${safe}`;
}
