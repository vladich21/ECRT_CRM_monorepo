import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { files, patentGrants, patents, refPatentStatuses } from '../../../database/schema';

const AUTO_STATUS_NAME_BY_KIND = {
  doc_prep: ['Подготовка документации'],
  submitted_cir: ['Сдано в ЦИР'],
  office_review: ['Заявка подана / на рассмотрении в ведомстве', 'Заявка подана или на рассмотрении в ведомстве'],
  review_query: ['Получен запрос, срок ответа до ДД.ММ.ГГГГ', 'На рассмотрении, запрос'],
  refusal: ['Отказ в выдаче'],
  decision: ['Решение о выдаче'],
  issued: ['Получен охранный документ', 'Выдан патент'],
} as const;

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

async function resolveStatusIdByNames(
  db: DatabaseService,
  statusNamesByPriority: readonly string[],
): Promise<string | null> {
  const rows = await db.db
    .select({ id: refPatentStatuses.id, name: refPatentStatuses.name })
    .from(refPatentStatuses)
    .where(inArray(refPatentStatuses.name, [...statusNamesByPriority]));
  if (rows.length === 0) return null;

  const rank = new Map(statusNamesByPriority.map((name, idx) => [name, idx]));
  rows.sort(
    (a, b) => (rank.get(a.name ?? '') ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.name ?? '') ?? Number.MAX_SAFE_INTEGER),
  );
  return rows[0]?.id ? String(rows[0].id) : null;
}

export async function syncPatentAutoStatus(db: DatabaseService, patentId: string): Promise<void> {
  const [patentRow] = await db.db
    .select({ registrationNumberCir: patents.registrationNumberCir, applicationNumber: patents.applicationNumber })
    .from(patents)
    .where(eq(patents.id, patentId))
    .limit(1);
  if (!patentRow) return;

  const [filesAgg] = await db.db
    .select({
      hasDecisionPositive: sql<boolean>`bool_or(${files.documentSection} = 'decision_positive')`,
      hasDecisionNegative: sql<boolean>`bool_or(${files.documentSection} = 'decision_negative')`,
      hasRequestsRequired: sql<boolean>`bool_or(${files.documentSection} = 'requests' and coalesce(${files.responseRequired}, false))`,
    })
    .from(files)
    .where(and(eq(files.entityType, 'patent'), eq(files.tableId, patentId)));

  const [grantAgg] = await db.db
    .select({ hasGrant: sql<boolean>`count(*) > 0` })
    .from(patentGrants)
    .where(eq(patentGrants.patentId, patentId));

  const hasGrant = Boolean(grantAgg?.hasGrant);
  const hasDecisionNegative = Boolean(filesAgg?.hasDecisionNegative);
  const hasDecisionPositive = Boolean(filesAgg?.hasDecisionPositive);
  const hasRequestsRequired = Boolean(filesAgg?.hasRequestsRequired);

  const statusCandidates = hasGrant
    ? AUTO_STATUS_NAME_BY_KIND.issued
    : hasDecisionNegative
      ? AUTO_STATUS_NAME_BY_KIND.refusal
      : hasDecisionPositive
        ? AUTO_STATUS_NAME_BY_KIND.decision
        : hasRequestsRequired
          ? AUTO_STATUS_NAME_BY_KIND.review_query
          : hasText(patentRow.applicationNumber)
            ? AUTO_STATUS_NAME_BY_KIND.office_review
            : hasText(patentRow.registrationNumberCir)
              ? AUTO_STATUS_NAME_BY_KIND.submitted_cir
              : AUTO_STATUS_NAME_BY_KIND.doc_prep;

  const statusId = await resolveStatusIdByNames(db, statusCandidates);
  if (!statusId) return;

  await db.db
    .update(patents)
    .set({ statusId, updatedAt: new Date() })
    .where(and(eq(patents.id, patentId), sql`${patents.statusId} is distinct from ${statusId}`));
}
