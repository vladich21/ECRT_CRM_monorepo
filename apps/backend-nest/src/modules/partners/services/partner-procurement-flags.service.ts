import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, notInArray, or, sql, type SQL } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  refPartnerCategories,
  supplierEvaluations,
  supplierPartnerProjectBlocks,
} from '../../../database/schema';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../domain/partner-approval.rules';
import {
  buildPartnerProcurementFlags,
  formatPartnerDisplayName,
  isoDateOnly,
  parseEvaluationLetter,
  parseEvaluationScore,
  pickProjectEvaluation,
  type PartnerProcurementCandidate,
  type PartnerProcurementFlags,
  type ProjectEvaluationPick,
} from '../domain/partner-procurement-flags';

@Injectable()
export class PartnerProcurementFlagsService {
  constructor(private readonly db: DatabaseService) {}

  async getOne(partnerId: string, projectId: string): Promise<PartnerProcurementFlags | null> {
    const record = await this.getRecord(partnerId, projectId);
    return record?.flags ?? null;
  }

  async getRecord(partnerId: string, projectId: string): Promise<PartnerProcurementCandidate | null> {
    const map = await this.loadRecords([partnerId], projectId);
    return map.get(partnerId) ?? null;
  }

  /** Актуальные флаги пачкой: для списков, где снимок дополняется текущим состоянием. */
  async getManyFlags(partnerIds: string[], projectId: string): Promise<Map<string, PartnerProcurementFlags>> {
    const records = await this.loadRecords(partnerIds, projectId);
    return new Map([...records].map(([id, record]) => [id, record.flags]));
  }

  async search(params: {
    search: string;
    projectId: string;
    excludePartnerIds?: string[];
    limit?: number;
  }): Promise<PartnerProcurementCandidate[]> {
    const normalized = params.search.replace(/\s+/g, ' ').trim();
    if (normalized.length < 2) return [];
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const escaped = normalized.replace(/[\\%_]/g, '\\$&');
    const term = `%${escaped}%`;
    const exclude = params.excludePartnerIds ?? [];
    const whereParts: SQL[] = [
      eq(partners.isDeleted, false),
      or(
        sql`${partners.name} ILIKE ${term} ESCAPE '\\'`,
        sql`${partners.shortName} ILIKE ${term} ESCAPE '\\'`,
        sql`${partners.inn} ILIKE ${term} ESCAPE '\\'`,
      )!,
    ];
    if (exclude.length > 0) whereParts.push(notInArray(partners.id, exclude));

    const rows = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(and(...whereParts)!)
      .orderBy(asc(partners.name))
      .limit(limit);

    const ids = rows.map(row => String(row.id));
    const records = await this.loadRecords(ids, params.projectId);
    return ids.map(id => records.get(id)).filter((row): row is PartnerProcurementCandidate => Boolean(row));
  }

  private async loadRecords(
    partnerIds: string[],
    projectId: string,
  ): Promise<Map<string, PartnerProcurementCandidate>> {
    const uniqueIds = [...new Set(partnerIds.filter(Boolean))];
    const result = new Map<string, PartnerProcurementCandidate>();
    if (uniqueIds.length === 0) return result;

    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.db.db
      .select({
        id: partners.id,
        name: partners.name,
        shortName: partners.shortName,
        inn: partners.inn,
        legalCheckPassed: partners.legalCheckPassed,
        questionnaireFilled: partners.questionnaireFilled,
        initialAssessmentDone: partners.initialAssessmentDone,
        categoryId: partners.categoryId,
      })
      .from(partners)
      .where(and(inArray(partners.id, uniqueIds), eq(partners.isDeleted, false))!);

    const categoryIds = rows.map(row => row.categoryId).filter((id): id is string => Boolean(id));
    const [categoryNames, blockedAny, blockedOnProject, initialEval, evaluationsByPartner] = await Promise.all([
      this.loadCategoryNamesByIds(categoryIds),
      this.loadBlockedPartnerIds(uniqueIds),
      this.loadBlockedPartnerIdsOnProject(uniqueIds, projectId),
      this.loadInitialEvalPartnerIds(uniqueIds),
      this.loadActiveProjectEvaluations(uniqueIds),
    ]);

    for (const row of rows) {
      const id = String(row.id);
      const categoryName = row.categoryId ? (categoryNames.get(String(row.categoryId)) ?? null) : null;
      const isApproved = computePartnerIsApproved({
        kind: inferPartnerCategoryKind(categoryName),
        legalCheckPassed: !!(row.legalCheckPassed ?? false),
        questionnaireFilled: !!(row.questionnaireFilled ?? false),
        initialAssessmentDone: !!(row.initialAssessmentDone ?? false) || initialEval.has(id),
        hasActiveSupplierEvaluationBlock: blockedAny.has(id),
      });
      const picked = pickProjectEvaluation(evaluationsByPartner.get(id) ?? [], projectId);
      result.set(id, {
        partner_id: id,
        name: formatPartnerDisplayName(row.shortName, row.name),
        inn: row.inn ?? '',
        flags: buildPartnerProcurementFlags({
          isApproved,
          evaluationCategory: parseEvaluationLetter(picked?.category),
          evaluationScore: parseEvaluationScore(picked?.weightedScore),
          nextReevaluationDate: isoDateOnly(picked?.nextReevaluationDate ?? null),
          blockedOnProject: blockedOnProject.has(id),
          today,
        }),
      });
    }
    return result;
  }

  private async loadCategoryNamesByIds(categoryIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (categoryIds.length === 0) return map;
    const catRows = await this.db.db
      .select({ id: refPartnerCategories.id, name: refPartnerCategories.name })
      .from(refPartnerCategories)
      .where(inArray(refPartnerCategories.id, categoryIds));
    for (const categoryRow of catRows) {
      map.set(String(categoryRow.id), categoryRow.name ?? '');
    }
    return map;
  }

  private async loadBlockedPartnerIds(partnerIds: string[]): Promise<Set<string>> {
    if (partnerIds.length === 0) return new Set();
    const blockRows = await this.db.db
      .select({ partnerId: supplierPartnerProjectBlocks.partnerId })
      .from(supplierPartnerProjectBlocks)
      .where(
        and(
          inArray(supplierPartnerProjectBlocks.partnerId, partnerIds),
          eq(supplierPartnerProjectBlocks.isActive, true),
        )!,
      );
    return new Set(blockRows.map(row => String(row.partnerId)));
  }

  private async loadBlockedPartnerIdsOnProject(partnerIds: string[], projectId: string): Promise<Set<string>> {
    if (partnerIds.length === 0) return new Set();
    const blockRows = await this.db.db
      .select({ partnerId: supplierPartnerProjectBlocks.partnerId })
      .from(supplierPartnerProjectBlocks)
      .where(
        and(
          inArray(supplierPartnerProjectBlocks.partnerId, partnerIds),
          eq(supplierPartnerProjectBlocks.projectId, projectId),
          eq(supplierPartnerProjectBlocks.isActive, true),
        )!,
      );
    return new Set(blockRows.map(row => String(row.partnerId)));
  }

  private async loadInitialEvalPartnerIds(partnerIds: string[]): Promise<Set<string>> {
    if (partnerIds.length === 0) return new Set();
    const rows = await this.db.db
      .selectDistinct({ partnerId: supplierEvaluations.partnerId })
      .from(supplierEvaluations)
      .where(
        and(
          inArray(supplierEvaluations.partnerId, partnerIds),
          eq(supplierEvaluations.scope, 'initial'),
          eq(supplierEvaluations.status, 'active'),
        )!,
      );
    return new Set(rows.map(row => String(row.partnerId)));
  }

  private async loadActiveProjectEvaluations(partnerIds: string[]): Promise<Map<string, ProjectEvaluationPick[]>> {
    const map = new Map<string, ProjectEvaluationPick[]>();
    if (partnerIds.length === 0) return map;
    const rows = await this.db.db
      .select({
        partnerId: supplierEvaluations.partnerId,
        projectId: supplierEvaluations.projectId,
        category: supplierEvaluations.category,
        weightedScore: supplierEvaluations.weightedScore,
        nextReevaluationDate: supplierEvaluations.nextReevaluationDate,
        evaluatedAt: supplierEvaluations.evaluatedAt,
      })
      .from(supplierEvaluations)
      .where(
        and(
          inArray(supplierEvaluations.partnerId, partnerIds),
          eq(supplierEvaluations.status, 'active'),
          eq(supplierEvaluations.scope, 'project'),
        )!,
      );
    for (const row of rows) {
      const id = String(row.partnerId);
      const list = map.get(id) ?? [];
      list.push({
        projectId: row.projectId ? String(row.projectId) : null,
        category: row.category,
        weightedScore: row.weightedScore,
        nextReevaluationDate: row.nextReevaluationDate,
        evaluatedAt: row.evaluatedAt,
      });
      map.set(id, list);
    }
    return map;
  }
}
