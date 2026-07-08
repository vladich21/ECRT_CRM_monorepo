import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, exists, ilike, inArray, isNull, not, or, sql } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  relPartnersTypes,
  relPartnersCompetencies,
  refPartnerCategories,
  supplierEvaluations,
  supplierPartnerProjectBlocks,
} from '../../../database/schema';
import type { DeletedScope } from '../../../common/deleted-scope';
import { sqlPartsForDeletedScope } from '../../../common/deleted-scope';
import { PartnerDerivedStatusService } from './partner-derived-status.service';
import type {
  PartnerListSortField,
  PartnerListSortOrder,
  PartnerListTabScope,
  PartnerListTriState,
  PartnerQueryFilters,
} from './partner-list.types';

@Injectable()
export class PartnerListQueryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly derivedStatus: PartnerDerivedStatusService,
  ) {}

  private listTabSql(tab: PartnerListTabScope): SQL | undefined {
    switch (tab) {
      case 'all':
        return undefined;
      case 'ready':
        return and(
          eq(partners.legalCheckPassed, true),
          eq(partners.questionnaireFilled, true),
          eq(partners.initialAssessmentDone, true),
        );
      case 'in_progress':
        return or(
          eq(partners.legalCheckPassed, false),
          eq(partners.questionnaireFilled, false),
          eq(partners.initialAssessmentDone, false),
        );
      case 'key_supplier':
        return eq(partners.isKeySupplier, true);
    }
  }

  private basePlusReadiness(baseParts: SQL[], tab: PartnerListTabScope): SQL {
    const extra = this.listTabSql(tab);
    const parts = extra ? [...baseParts, extra] : [...baseParts];
    return parts.length ? and(...parts)! : sql`true`;
  }

  whereWithDeletion(
    baseParts: SQL[],
    readinessTab: PartnerListTabScope,
    deletedScope: DeletedScope,
  ): SQL {
    const inner = this.basePlusReadiness(baseParts, readinessTab);
    const dels = sqlPartsForDeletedScope(partners.isDeleted, deletedScope);
    if (dels.length === 0) return inner;
    return and(inner, dels[0])!;
  }

  private seActiveProjectPredicates() {
    return [
      eq(supplierEvaluations.partnerId, partners.id),
      eq(supplierEvaluations.status, 'active'),
      eq(supplierEvaluations.scope, 'project'),
    ] as const;
  }

  private partnerApprovedMatchSql(): SQL {
    const blockedExists = exists(
      this.db.db
        .select({ one: sql`1` })
        .from(supplierPartnerProjectBlocks)
        .where(
          and(
            eq(supplierPartnerProjectBlocks.partnerId, partners.id),
            eq(supplierPartnerProjectBlocks.isActive, true),
          )!,
        ),
    );
    const resourceCategory = exists(
      this.db.db
        .select({ one: sql`1` })
        .from(refPartnerCategories)
        .where(
          and(eq(refPartnerCategories.id, partners.categoryId), ilike(refPartnerCategories.name, '%ресурс%'))!,
        ),
    );
    const hasActiveInitialEval = exists(
      this.db.db
        .select({ one: sql`1` })
        .from(supplierEvaluations)
        .where(
          and(
            eq(supplierEvaluations.partnerId, partners.id),
            eq(supplierEvaluations.scope, 'initial'),
            eq(supplierEvaluations.status, 'active'),
          )!,
        ),
    );
    return and(
      not(blockedExists),
      or(
        and(resourceCategory, eq(partners.legalCheckPassed, true))!,
        and(
          not(resourceCategory),
          eq(partners.legalCheckPassed, true),
          eq(partners.questionnaireFilled, true),
          or(eq(partners.initialAssessmentDone, true), hasActiveInitialEval)!,
        )!,
      )!,
    )!;
  }

  private partnerEngineeringCategorySql(): SQL {
    return exists(
      this.db.db
        .select({ one: sql`1` })
        .from(refPartnerCategories)
        .where(
          and(
            eq(refPartnerCategories.id, partners.categoryId),
            ilike(refPartnerCategories.name, '%инжинир%'),
          )!,
        ),
    );
  }

  private async requiredEvaluationAttentionSql(): Promise<SQL> {
    const statusIds = await this.derivedStatus.resolvePartnerOperationalStatusIds();
    const isEngineering = this.partnerEngineeringCategorySql();
    const approvedExpr = this.partnerApprovedMatchSql();

    // Только утвержденные инжиниринговые со статусом Активный или Потенциальный.
    const shouldBeEvaluated = and(
      isEngineering,
      approvedExpr,
      or(
        eq(partners.statusId, statusIds.activeId),
        eq(partners.statusId, statusIds.potentialId),
      )!,
    )!;

    const hasActiveInitialEval = exists(
      this.db.db
        .select({ one: sql`1` })
        .from(supplierEvaluations)
        .where(
          and(
            eq(supplierEvaluations.partnerId, partners.id),
            eq(supplierEvaluations.scope, 'initial'),
            eq(supplierEvaluations.status, 'active'),
          )!,
        ),
    );
    const overdueEvalExists = exists(
      this.db.db
        .select({ one: sql`1` })
        .from(supplierEvaluations)
        .where(
          and(
            eq(supplierEvaluations.partnerId, partners.id),
            eq(supplierEvaluations.status, 'active'),
            sql`${supplierEvaluations.nextReevaluationDate} is not null`,
            sql`${supplierEvaluations.nextReevaluationDate} < CURRENT_DATE`,
          )!,
        ),
    );

    // Missing: Активный + нет первичной оценки.
    const isActiveMissing = and(
      eq(partners.statusId, statusIds.activeId),
      not(hasActiveInitialEval),
    )!;
    // Overdue: есть первичная оценка И переоценка просрочена (для Активных и Потенциальных).
    const isOverdue = and(hasActiveInitialEval, overdueEvalExists)!;

    return and(shouldBeEvaluated, or(isActiveMissing, isOverdue)!)!;
  }

  private appendRegistryExtendedFilters(parts: SQL[], filters?: PartnerQueryFilters): void {
    if (!filters) return;
    const triStateValue = (value?: PartnerListTriState) => value ?? 'all';

    if (filters.categoryIds?.length || filters.categoryIdsIncludeNull) {
      const categoryParts: SQL[] = [];
      if (filters.categoryIds?.length) {
        categoryParts.push(inArray(partners.categoryId, filters.categoryIds));
      }
      if (filters.categoryIdsIncludeNull) {
        categoryParts.push(isNull(partners.categoryId));
      }
      if (categoryParts.length === 1) parts.push(categoryParts[0]!);
      else if (categoryParts.length > 1) parts.push(or(...categoryParts)!);
    }

    if (triStateValue(filters.isKeySupplier) === 'yes') parts.push(eq(partners.isKeySupplier, true));
    if (triStateValue(filters.isKeySupplier) === 'no') parts.push(eq(partners.isKeySupplier, false));
    if (triStateValue(filters.isTargeted) === 'yes') parts.push(eq(partners.isTargeted, true));
    if (triStateValue(filters.isTargeted) === 'no') parts.push(eq(partners.isTargeted, false));
    if (triStateValue(filters.legalCheckPassed) === 'yes') parts.push(eq(partners.legalCheckPassed, true));
    if (triStateValue(filters.legalCheckPassed) === 'no') parts.push(eq(partners.legalCheckPassed, false));
    if (triStateValue(filters.questionnaireFilled) === 'yes') parts.push(eq(partners.questionnaireFilled, true));
    if (triStateValue(filters.questionnaireFilled) === 'no') parts.push(eq(partners.questionnaireFilled, false));
    if (triStateValue(filters.initialAssessmentDone) === 'yes') parts.push(eq(partners.initialAssessmentDone, true));
    if (triStateValue(filters.initialAssessmentDone) === 'no') parts.push(eq(partners.initialAssessmentDone, false));

    const cats = filters.evaluationCategories;
    if (cats?.length) {
      const letters = cats.filter((c): c is 'A' | 'B' | 'C' | 'D' =>
        c === 'A' || c === 'B' || c === 'C' || c === 'D',
      );
      const wantNone = cats.includes('none');
      const orParts: SQL[] = [];
      if (letters.length) {
        orParts.push(
          exists(
            this.db.db
              .select({ one: sql`1` })
              .from(supplierEvaluations)
              .where(
                and(...this.seActiveProjectPredicates(), inArray(supplierEvaluations.category, letters))!,
              ),
          ),
        );
      }
      if (wantNone) {
        orParts.push(
          not(
            exists(
              this.db.db
                .select({ one: sql`1` })
                .from(supplierEvaluations)
                .where(and(...this.seActiveProjectPredicates())!),
            ),
          ),
        );
      }
      if (orParts.length === 1) parts.push(orParts[0]!);
      else if (orParts.length > 1) parts.push(or(...orParts)!);
    }

    if (triStateValue(filters.reevaluationOverdue) === 'yes') {
      parts.push(
        exists(
          this.db.db
            .select({ one: sql`1` })
            .from(supplierEvaluations)
            .where(
              and(
                ...this.seActiveProjectPredicates(),
                sql`${supplierEvaluations.nextReevaluationDate} is not null`,
                sql`${supplierEvaluations.nextReevaluationDate} < CURRENT_DATE`,
              )!,
            ),
        ),
      );
    }
    if (triStateValue(filters.reevaluationOverdue) === 'no') {
      parts.push(
        not(
          exists(
            this.db.db
              .select({ one: sql`1` })
              .from(supplierEvaluations)
              .where(
                and(
                  ...this.seActiveProjectPredicates(),
                  sql`${supplierEvaluations.nextReevaluationDate} is not null`,
                  sql`${supplierEvaluations.nextReevaluationDate} < CURRENT_DATE`,
                )!,
              ),
          ),
        ),
      );
    }

    if (triStateValue(filters.hasActiveBlocks) === 'yes') {
      parts.push(
        exists(
          this.db.db
            .select({ one: sql`1` })
            .from(supplierPartnerProjectBlocks)
            .where(
              and(
                eq(supplierPartnerProjectBlocks.partnerId, partners.id),
                eq(supplierPartnerProjectBlocks.isActive, true),
              )!,
            ),
        ),
      );
    }
    if (triStateValue(filters.hasActiveBlocks) === 'no') {
      parts.push(
        not(
          exists(
            this.db.db
              .select({ one: sql`1` })
              .from(supplierPartnerProjectBlocks)
              .where(
                and(
                  eq(supplierPartnerProjectBlocks.partnerId, partners.id),
                  eq(supplierPartnerProjectBlocks.isActive, true),
                )!,
              ),
          ),
        ),
      );
    }

    const approvedTri = triStateValue(filters.isApproved);
    if (approvedTri === 'yes' || approvedTri === 'no') {
      const approvedExpr = this.partnerApprovedMatchSql();
      parts.push(approvedTri === 'yes' ? approvedExpr : not(approvedExpr));
    }
  }

  buildPartnerListOrderBy(sortBy?: PartnerListSortField, sortOrder?: PartnerListSortOrder): SQL[] {
    const dirDesc = sortOrder === 'desc';
    switch (sortBy) {
      case 'created_at':
        return [dirDesc ? desc(partners.createdAt) : asc(partners.createdAt)];
      case 'weighted_score': {
        const expr = sql`(select avg(cast(weighted_score as numeric)) from supplier_evaluations se where se.partner_id = ${partners.id} and se.status = 'active' and se.scope = 'project')`;
        return [dirDesc ? sql`${expr} DESC NULLS LAST` : sql`${expr} ASC NULLS LAST`];
      }
      case 'next_reevaluation_date': {
        const expr = sql`(select min(se.next_reevaluation_date) from supplier_evaluations se where se.partner_id = ${partners.id} and se.status = 'active' and se.scope = 'project')`;
        return [dirDesc ? sql`${expr} DESC NULLS LAST` : sql`${expr} ASC NULLS LAST`];
      }
      case 'status_name': {
        const expr = sql`(select s.name from ref_partner_statuses s where s.id = ${partners.statusId})`;
        return [dirDesc ? sql`${expr} DESC NULLS LAST` : sql`${expr} ASC NULLS LAST`];
      }
      case 'name':
      default:
        return [dirDesc ? desc(partners.name) : asc(partners.name)];
    }
  }

  async countPartners(where: SQL): Promise<number> {
    const rows = await this.db.db.select({ value: count() }).from(partners).where(where);
    return Number(rows[0]?.value ?? 0);
  }

  async buildPartnerBaseParts(filters?: PartnerQueryFilters): Promise<SQL[] | null> {
    const parts: SQL[] = [];
    const raw = filters?.search?.trim();
    if (raw) {
      const normalized = raw.replace(/\s+/g, ' ').trim();
      if (normalized.length > 0) {
        const escaped = normalized.replace(/[\\%_]/g, '\\$&');
        const term = `%${escaped}%`;
        parts.push(
          or(
            sql`${partners.name} ILIKE ${term} ESCAPE '\\'`,
            sql`${partners.shortName} ILIKE ${term} ESCAPE '\\'`,
            sql`${partners.inn} ILIKE ${term} ESCAPE '\\'`,
          )!,
        );
      }
    }
    if (filters?.statusIds?.length) {
      parts.push(inArray(partners.statusId, filters.statusIds));
    }
    if (filters?.typeIds?.length) {
      const typeRows = await this.db.db
        .select({ partnerId: relPartnersTypes.partnerId })
        .from(relPartnersTypes)
        .where(inArray(relPartnersTypes.typeId, filters.typeIds));
      const matchedIds = [...new Set(typeRows.map((relRow) => relRow.partnerId).filter(Boolean))] as string[];
      if (matchedIds.length === 0) return null;
      parts.push(inArray(partners.id, matchedIds));
    }
    if (filters?.competenceIds?.length) {
      const compRows = await this.db.db
        .select({ partnerId: relPartnersCompetencies.partnerId })
        .from(relPartnersCompetencies)
        .where(inArray(relPartnersCompetencies.competenceId, filters.competenceIds));
      const matchedIds = [...new Set(compRows.map((relRow) => relRow.partnerId).filter(Boolean))] as string[];
      if (matchedIds.length === 0) return null;
      parts.push(inArray(partners.id, matchedIds));
    }
    this.appendRegistryExtendedFilters(parts, filters);
    const evaluationRequiredTri = filters?.evaluationRequired ?? 'all';
    if (evaluationRequiredTri === 'yes' || evaluationRequiredTri === 'no') {
      const requiredAttentionExpr = await this.requiredEvaluationAttentionSql();
      parts.push(evaluationRequiredTri === 'yes' ? requiredAttentionExpr : not(requiredAttentionExpr));
    }
    return parts;
  }
}
