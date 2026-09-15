import { Tag, Tooltip } from 'antd';

import type { PartnerProcurementFlags } from '@/api/procurement/requests/procurementRequest.types';
import { SURFACE_BLOCKED, SURFACE_NEUTRAL, type StatusBadgeSurface } from '@/constants/statusBadgeSurfaces';
import { formatEvaluationScoreDisplay, scoreColor } from '@/pages/partners/evaluations/supplierEvaluationUi';

function surfaceStyle(surface: StatusBadgeSurface) {
  return { background: surface.background, borderColor: surface.borderColor, color: surface.color };
}

/** Балл красим ровно как в реестре оценок: цвет ведёт сам балл, а не тип тега antd. */
function scoreStyle(score: number | null | undefined) {
  if (score == null) return surfaceStyle(SURFACE_NEUTRAL);
  const accent = scoreColor(score);
  return {
    borderColor: accent,
    color: accent,
    background: `color-mix(in srgb, ${accent} 12%, white)`,
  };
}

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return 'Нет оценки';
  return formatEvaluationScoreDisplay(score);
}

/** Снимки, записанные до появления балла, хранят только категорию — балл в них не выдумываем. */
function snapshotHint(snapshot: PartnerProcurementFlags | null): string {
  if (!snapshot) return 'Снимок на момент добавления не сохранён';
  const parts: string[] = [];
  if (snapshot.evaluation_score != null) parts.push(`балл ${formatEvaluationScoreDisplay(snapshot.evaluation_score)}`);
  if (snapshot.evaluation_category) parts.push(`категория ${snapshot.evaluation_category}`);
  if (parts.length === 0) parts.push('оценки не было');
  if (snapshot.blocked_on_project) parts.push('блок по проекту');
  if (!snapshot.is_approved) parts.push('не утверждён');
  return `При добавлении в запрос: ${parts.join(', ')}`;
}

/** `snapshot` не передан — кандидат ещё не в запросе, сравнивать не с чем. */
export function EvaluationScoreTag({
  flags,
  snapshot,
}: {
  flags: PartnerProcurementFlags | null | undefined;
  snapshot?: PartnerProcurementFlags | null;
}) {
  const score = flags?.evaluation_score;
  const tag = <Tag style={scoreStyle(score)}>{scoreLabel(score)}</Tag>;
  if (snapshot === undefined) return tag;
  return <Tooltip title={snapshotHint(snapshot)}>{tag}</Tooltip>;
}

export function SupplierFlagTags({
  flags,
  snapshot,
}: {
  flags: PartnerProcurementFlags | null | undefined;
  snapshot?: PartnerProcurementFlags | null;
}) {
  if (!flags) return <Tag style={surfaceStyle(SURFACE_NEUTRAL)}>Нет данных</Tag>;
  return (
    <>
      <EvaluationScoreTag flags={flags} snapshot={snapshot} />
      {flags.blocked_on_project ? <Tag style={surfaceStyle(SURFACE_BLOCKED)}>Блок по проекту</Tag> : null}
      {!flags.is_approved ? <Tag style={surfaceStyle(SURFACE_BLOCKED)}>Не утвержден</Tag> : null}
      {flags.reevaluation_overdue ? <Tag style={surfaceStyle(SURFACE_BLOCKED)}>Переоценка просрочена</Tag> : null}
    </>
  );
}
