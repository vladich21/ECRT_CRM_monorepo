import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, exists, ilike, inArray, isNull, ne, not, or, sql } from 'drizzle-orm';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  relPartnersTypes,
  relPartnersCompetencies,
  contracts,
  refPartnerStatuses,
  refPartnerEconomicCategories,
  refPartnerTypes,
  refPartnerCompetencies,
  refPartnerCategories,
  supplierEvaluations,
  supplierPartnerProjectBlocks,
} from '../../../database/schema';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../domain/partner-approval.rules';
import { PaginationParams } from '../../../common/pagination';
import type { DeletedScope, DeletionTabCounts } from '../../../common/deleted-scope';
import { sqlPartsForDeletedScope } from '../../../common/deleted-scope';
import { SupplierEvaluationsService } from '../../supplier-evaluations/services/supplier-evaluations.service';

export type PartnerListTabScope = 'all' | 'ready' | 'in_progress' | 'key_supplier';

export type PartnerListTriState = 'yes' | 'no' | 'all';

export type PartnerListSortField =
  | 'name'
  | 'created_at'
  | 'weighted_score'
  | 'next_reevaluation_date'
  | 'status_name';

export type PartnerListSortOrder = 'asc' | 'desc';

export type PartnerEvaluationCategoryFilterToken = 'A' | 'B' | 'C' | 'D' | 'none';
export type PartnerEvaluationRequiredValue = 'none' | 'missing' | 'overdue';

export interface PartnerQueryFilters {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: PartnerListTabScope;
  deletedScope?: DeletedScope;
  evaluationCategories?: PartnerEvaluationCategoryFilterToken[];
  categoryIds?: string[];
  categoryIdsIncludeNull?: boolean;
  evaluationRequired?: PartnerListTriState;
  isKeySupplier?: PartnerListTriState;
  isTargeted?: PartnerListTriState;
  reevaluationOverdue?: PartnerListTriState;
  hasActiveBlocks?: PartnerListTriState;
  isApproved?: PartnerListTriState;
  legalCheckPassed?: PartnerListTriState;
  questionnaireFilled?: PartnerListTriState;
  initialAssessmentDone?: PartnerListTriState;
  sortBy?: PartnerListSortField;
  sortOrder?: PartnerListSortOrder;
  previewExcludeArchived?: boolean;
}

export interface PartnersListPayload {
  data: unknown[];
  total: number;
  tab_counts: {
    all: number;
    ready: number;
    in_progress: number;
    key_supplier: number;
  };
  deletion_tab_counts: DeletionTabCounts;
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => SupplierEvaluationsService))
    private readonly supplierEvaluationsService: SupplierEvaluationsService,
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

  private whereWithDeletion(
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
    const statusIds = await this.resolvePartnerOperationalStatusIds();
    const isEngineering = this.partnerEngineeringCategorySql();
    const approvedExpr = this.partnerApprovedMatchSql();
    const shouldBeEvaluated = and(
      isEngineering,
      or(
        eq(partners.statusId, statusIds.activeId),
        and(eq(partners.statusId, statusIds.potentialId), approvedExpr)!,
      )!,
    )!;

    const activeEvalExists = exists(
      this.db.db
        .select({ one: sql`1` })
        .from(supplierEvaluations)
        .where(and(eq(supplierEvaluations.partnerId, partners.id), eq(supplierEvaluations.status, 'active'))!),
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

    return and(shouldBeEvaluated, or(not(activeEvalExists), overdueEvalExists)!)!;
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

  private buildPartnerListOrderBy(sortBy?: PartnerListSortField, sortOrder?: PartnerListSortOrder): SQL[] {
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

  private async countPartners(where: SQL): Promise<number> {
    const rows = await this.db.db.select({ value: count() }).from(partners).where(where);
    return Number(rows[0]?.value ?? 0);
  }

  private isOperationalStatusDeriveEnabled(): boolean {
    return true;
  }

  private async syncDerivedPartnerStatusForPartnersMatching(where: SQL): Promise<void> {
    if (!this.isOperationalStatusDeriveEnabled()) return;
    const idRows = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(where)
      .orderBy(asc(partners.name));
    const partnerIds = idRows.map((row) => String(row.id)).filter(Boolean);
    const parallelBatchSize = 40;
    for (let startIndex = 0; startIndex < partnerIds.length; startIndex += parallelBatchSize) {
      const chunk = partnerIds.slice(startIndex, startIndex + parallelBatchSize);
      await Promise.all(
        chunk.map((partnerId) => this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: false })),
      );
    }
  }

  private async buildPartnerBaseParts(filters?: PartnerQueryFilters): Promise<SQL[] | null> {
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

  async findAll(
    preview?: boolean,
    pagination?: PaginationParams,
    filters?: PartnerQueryFilters,
  ): Promise<PartnersListPayload> {

    if (preview) {
      const { blockedId, archiveId } = await this.resolvePartnerOperationalStatusIds();
      const previewParts: SQL[] = [
        eq(partners.isDeleted, false),
        or(isNull(partners.statusId), ne(partners.statusId, blockedId))!,
      ];
      const rawSearch = filters?.search?.trim();
      if (rawSearch) {
        const normalized = rawSearch.replace(/\s+/g, ' ').trim();
        if (normalized.length > 0) {
          const escaped = normalized.replace(/[\\%_]/g, '\\$&');
          const term = `%${escaped}%`;
          previewParts.push(
            or(
              sql`${partners.name} ILIKE ${term} ESCAPE '\\'`,
              sql`${partners.shortName} ILIKE ${term} ESCAPE '\\'`,
              sql`${partners.inn} ILIKE ${term} ESCAPE '\\'`,
            )!,
          );
        }
      }
      if (filters?.previewExcludeArchived) {
        previewParts.push(or(isNull(partners.statusId), ne(partners.statusId, archiveId))!);
      }
      const rows = await this.db.db
        .select({ id: partners.id, name: partners.name, shortName: partners.shortName, inn: partners.inn })
        .from(partners)
        .where(and(...previewParts)!)
        .orderBy(asc(partners.name));
      const data = rows.map((row) => {
        const shortName = (row.shortName ?? '').trim();
        const fullName = (row.name ?? '').trim();
        return {
          id: String(row.id),
          name: shortName || fullName || '',
          short_name: shortName,
          inn: row.inn ?? '',
        };
      });
      const partnerCount = data.length;
      return {
        data,
        total: partnerCount,
        tab_counts: { all: partnerCount, ready: 0, in_progress: 0, key_supplier: 0 },
        deletion_tab_counts: { active: partnerCount, deleted: 0, all: partnerCount },
      };
    }

    const baseParts = await this.buildPartnerBaseParts(filters);
    if (baseParts === null) {
      return {
        data: [],
        total: 0,
        tab_counts: { all: 0, ready: 0, in_progress: 0, key_supplier: 0 },
        deletion_tab_counts: { active: 0, deleted: 0, all: 0 },
      };
    }

    const deletedScope: DeletedScope = filters?.deletedScope ?? 'active';
    const tab = filters?.readiness ?? 'all';

    const { limit = 20, offset = 0 } = pagination ?? {};

    const listWhere = this.whereWithDeletion(baseParts, tab, deletedScope);

    const shouldSyncDerivedStatusBeforeList =
      this.isOperationalStatusDeriveEnabled() && Boolean(filters?.statusIds?.length) && limit > 1;

    if (shouldSyncDerivedStatusBeforeList) {
      await this.syncDerivedPartnerStatusForPartnersMatching(listWhere);
    }

    const [tabAll, tabReady, tabInProgress, tabKeySupplier, delActive, delDeleted, delAll, listTotal, rows] =
      await Promise.all([
        this.countPartners(this.whereWithDeletion(baseParts, 'all', 'all')),
        this.countPartners(this.whereWithDeletion(baseParts, 'ready', 'all')),
        this.countPartners(this.whereWithDeletion(baseParts, 'in_progress', 'all')),
        this.countPartners(this.whereWithDeletion(baseParts, 'key_supplier', 'all')),
        this.countPartners(this.whereWithDeletion(baseParts, tab, 'active')),
        this.countPartners(this.whereWithDeletion(baseParts, tab, 'deleted')),
        this.countPartners(this.whereWithDeletion(baseParts, tab, 'all')),
        this.countPartners(listWhere),
        this.db.db
          .select()
          .from(partners)
          .where(listWhere)
          .orderBy(...this.buildPartnerListOrderBy(filters?.sortBy, filters?.sortOrder))
          .limit(limit)
          .offset(offset),
      ]);

    const total = listTotal;

    const pagePartnerIds = rows.map((row) => row.id).filter(Boolean) as string[];

    if (
      this.isOperationalStatusDeriveEnabled() &&
      !shouldSyncDerivedStatusBeforeList &&
      pagePartnerIds.length > 0
    ) {
      await Promise.all(
        pagePartnerIds.map((partnerId) => this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: false })),
      );
    }

    let rowsForList = rows;
    if (this.isOperationalStatusDeriveEnabled() && pagePartnerIds.length > 0) {
      const freshList = await this.db.db.select().from(partners).where(inArray(partners.id, pagePartnerIds));
      const freshByPartnerId = new Map(freshList.map((freshRow) => [String(freshRow.id), freshRow]));
      rowsForList = rows.map((originalRow) => freshByPartnerId.get(String(originalRow.id)) ?? originalRow);
    }

    const [typeRows, compRows] = pagePartnerIds.length
      ? await Promise.all([
          this.db.db
            .select({ partnerId: relPartnersTypes.partnerId, typeId: relPartnersTypes.typeId })
            .from(relPartnersTypes)
            .where(inArray(relPartnersTypes.partnerId, pagePartnerIds)),
          this.db.db
            .select({ partnerId: relPartnersCompetencies.partnerId, competenceId: relPartnersCompetencies.competenceId })
            .from(relPartnersCompetencies)
            .where(inArray(relPartnersCompetencies.partnerId, pagePartnerIds)),
        ])
      : [[], []];

    const typeMap = new Map<string, string[]>();
    for (const typeLinkRow of typeRows) {
      if (typeLinkRow.partnerId && typeLinkRow.typeId) {
        const arr = typeMap.get(String(typeLinkRow.partnerId)) ?? [];
        arr.push(String(typeLinkRow.typeId));
        typeMap.set(String(typeLinkRow.partnerId), arr);
      }
    }

    const compMap = new Map<string, string[]>();
    for (const competenceLinkRow of compRows) {
      if (competenceLinkRow.partnerId && competenceLinkRow.competenceId) {
        const arr = compMap.get(String(competenceLinkRow.partnerId)) ?? [];
        arr.push(String(competenceLinkRow.competenceId));
        compMap.set(String(competenceLinkRow.partnerId), arr);
      }
    }

    const partnerIds = rowsForList.map((row) => String(row.id));
    const categoryIds = [...new Set(rowsForList.map((row) => row.categoryId).filter(Boolean))] as string[];

    const [categoryNameById, blockedPartnerIds, initialEvalPartnerIds, activeEvalFactsByPartnerId, statusIds] =
      await Promise.all([
        this.loadCategoryNamesByIds(categoryIds),
        this.loadBlockedPartnerIds(partnerIds),
        this.loadInitialEvalPartnerIds(partnerIds),
        this.loadActiveEvaluationFactsByPartnerId(partnerIds),
        this.resolvePartnerOperationalStatusIds(),
      ]);

    const data = rowsForList.map((row) => {
      const partnerId = String(row.id);
      const statusId = row.statusId ? String(row.statusId) : null;
      const categoryId = row.categoryId ? String(row.categoryId) : '';
      const categoryName = categoryId ? categoryNameById.get(categoryId) ?? null : null;
      const hasBlock = blockedPartnerIds.has(partnerId);
      const hasInitialEval = initialEvalPartnerIds.has(partnerId);
      const extras = this.partnerApprovalExtras(row, categoryName, hasBlock, hasInitialEval);
      const evalFacts = activeEvalFactsByPartnerId.get(partnerId) ?? { hasActive: false, hasOverdue: false };
      const evaluationRequired = this.computeEvaluationRequiredForPartner({
        statusId,
        categoryName,
        isApproved: extras.isApproved,
        hasActiveEvaluation: evalFacts.hasActive,
        hasOverdueEvaluation: evalFacts.hasOverdue,
        statusIds,
      });
      return {
        ...this.toResponse(row, { ...extras, evaluationRequired }),
        type_ids: typeMap.get(partnerId) ?? [],
        competence_ids: compMap.get(partnerId) ?? [],
      };
    });

    return {
      data,
      total,
      tab_counts: {
        all: tabAll,
        ready: tabReady,
        in_progress: tabInProgress,
        key_supplier: tabKeySupplier,
      },
      deletion_tab_counts: {
        active: delActive,
        deleted: delDeleted,
        all: delAll,
      },
    };
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const pid = String(row.id);
    let rowForResponse = row;
    if (this.isOperationalStatusDeriveEnabled()) {
      const statusNameBefore = await this.getPartnerStatusName(row.statusId ? String(row.statusId) : null);
      if ((statusNameBefore ?? '').trim() !== 'Архив') {
        await this.applyDerivedPartnerStatus(pid, { ignoreArchiveLock: false });
      }
      const rowsFresh = await this.db.db
        .select()
        .from(partners)
        .where(eq(partners.id, id))
        .limit(1);
      rowForResponse = rowsFresh[0] ?? row;
    }
    const catId = rowForResponse.categoryId ? String(rowForResponse.categoryId) : '';
    const [typeRows, compRows, categoryNameById, blockedPartnerIds, initialEvalIds, activeEvalFacts, statusIds] =
      await Promise.all([
        this.db.db
          .select({ typeId: relPartnersTypes.typeId })
          .from(relPartnersTypes)
          .where(eq(relPartnersTypes.partnerId, id)),
        this.db.db
          .select({ competenceId: relPartnersCompetencies.competenceId })
          .from(relPartnersCompetencies)
          .where(eq(relPartnersCompetencies.partnerId, id)),
        catId ? this.loadCategoryNamesByIds([catId]) : Promise.resolve(new Map<string, string>()),
        this.loadBlockedPartnerIds([pid]),
        this.loadInitialEvalPartnerIds([pid]),
        this.loadActiveEvaluationFactsByPartnerId([pid]),
        this.resolvePartnerOperationalStatusIds(),
      ]);
    const catName = catId ? categoryNameById.get(catId) ?? null : null;
    const hasBlock = blockedPartnerIds.has(pid);
    const hasInitialEval = initialEvalIds.has(pid);
    const extras = this.partnerApprovalExtras(rowForResponse, catName, hasBlock, hasInitialEval);
    const statusId = rowForResponse.statusId ? String(rowForResponse.statusId) : null;
    const evalFacts = activeEvalFacts.get(pid) ?? { hasActive: false, hasOverdue: false };
    const evaluationRequired = this.computeEvaluationRequiredForPartner({
      statusId,
      categoryName: catName,
      isApproved: extras.isApproved,
      hasActiveEvaluation: evalFacts.hasActive,
      hasOverdueEvaluation: evalFacts.hasOverdue,
      statusIds,
    });
    return {
      ...this.toResponse(rowForResponse, { ...extras, evaluationRequired }),
      type_ids: typeRows.map((typeRow) => String(typeRow.typeId)).filter(Boolean),
      competence_ids: compRows.map((compRow) => String(compRow.competenceId)).filter(Boolean),
    };
  }

  async create(data: Record<string, unknown>, userId?: string) {
    this.validateInnKppRequired(data);
    await this.validateReferences(data);
    const manualArchive = this.parseManualArchiveFlag(data);
    const statusIds = await this.resolvePartnerOperationalStatusIds();
    const insertData = {
      ...this.mapToDb(data),
      statusId: manualArchive === true ? statusIds.archiveId : null,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    };
    await this.checkInnKppUnique(insertData.inn, insertData.kpp);
    const [row] = await this.db.db.insert(partners).values(insertData).returning();
    if (!row) return null;
    const partnerId = String(row.id);
    await this.syncRelTables(partnerId, data);
    if (manualArchive === true) {
      await this.supplierEvaluationsService.archiveAllActiveByPartner(partnerId);
    } else if (this.isOperationalStatusDeriveEnabled()) {
      await this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: true });
    }
    return this.findOne(partnerId);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    const current = await this.findOne(id);
    if (!current) return null;
    const currentStatusName = this.isOperationalStatusDeriveEnabled()
      ? await this.getPartnerStatusName(current.status_id ? String(current.status_id) : null)
      : null;
    const manualArchive = this.parseManualArchiveFlag(data);
    const merged = { ...current, ...data };
    this.validateInnKppRequired(merged);
    await this.validateReferences(data);
    if (data.inn !== undefined || data.kpp !== undefined) {
      const innVal = merged.inn && String(merged.inn).trim() ? String(merged.inn).trim() : null;
      const kppVal = merged.kpp && String(merged.kpp).trim() ? String(merged.kpp).trim() : null;
      await this.checkInnKppUnique(innVal, kppVal, id);
    }
    const map: Record<string, string> = {
      name: 'name',
      short_name: 'shortName',
      inn: 'inn',
      kpp: 'kpp',
      ogrn: 'ogrn',
      legal_address: 'legalAddress',
      actual_address: 'actualAddress',
      phone: 'phone',
      email: 'email',
      website: 'website',
      category_id: 'categoryId',
      comment: 'comment',
      partner_economic_category_id: 'partnerEconomicCategoryId',
      is_key_supplier: 'isKeySupplier',
      is_targeted: 'isTargeted',
      legal_check_passed: 'legalCheckPassed',
      questionnaire_filled: 'questionnaireFilled',
      initial_assessment_done: 'initialAssessmentDone',
      rating: 'rating',
      next_audit_date: 'nextAuditDate',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (userId) updateObj.updatedBy = userId;
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) updateObj[camel] = data[snake];
    }
    await this.db.db.update(partners).set(updateObj).where(eq(partners.id, id));
    await this.syncRelTables(id, data);

    if (manualArchive === true) {
      const hasEffectiveContract = await this.partnerHasAtLeastOneEffectiveContract(id);
      if (hasEffectiveContract) {
        throw new ConflictException(
          'Невозможно архивировать контрагента: есть действующий договор. Завершите или деактивируйте договор перед архивацией.',
        );
      }
      const { archiveId } = await this.resolvePartnerOperationalStatusIds();
      await this.db.db
        .update(partners)
        .set({
          statusId: archiveId,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(partners.id, id));
      await this.supplierEvaluationsService.archiveAllActiveByPartner(id);
    } else if (manualArchive === false) {
      await this.exitArchiveStatus(id, userId);
    } else if (this.isOperationalStatusDeriveEnabled()) {
      if ((currentStatusName ?? '').trim() !== 'Архив') {
        await this.applyDerivedPartnerStatus(id, { ignoreArchiveLock: false });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    const contractRefs = await this.db.db
      .select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.partnerId, id), eq(contracts.isDeleted, false)))
      .limit(1);
    if (contractRefs.length > 0) {
      throw new ConflictException(
        'Невозможно удалить партнёра: к нему привязаны активные (не удалённые) договоры.',
      );
    }
    await this.db.db
      .update(partners)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(partners.id, id));
    return this.findOne(id);
  }

  async restore(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .update(partners)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(partners.id, id));
    return this.findOne(id);
  }

  async refreshPartnerDerivedStatus(partnerId: string): Promise<void> {
    await this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: false });
  }

  private async syncRelTables(partnerId: string, data: Record<string, unknown>) {
    const typeIds = Array.isArray(data.type_ids) ? data.type_ids.filter((x): x is string => typeof x === 'string') : [];
    const competenceIds = Array.isArray(data.competence_ids)
      ? data.competence_ids.filter((x): x is string => typeof x === 'string')
      : [];
    await this.db.db.delete(relPartnersTypes).where(eq(relPartnersTypes.partnerId, partnerId));
    await this.db.db.delete(relPartnersCompetencies).where(eq(relPartnersCompetencies.partnerId, partnerId));
    if (typeIds.length) {
      await this.db.db.insert(relPartnersTypes).values(
        typeIds.map((typeId) => ({ partnerId, typeId })),
      );
    }
    if (competenceIds.length) {
      await this.db.db.insert(relPartnersCompetencies).values(
        competenceIds.map((competenceId) => ({ partnerId, competenceId })),
      );
    }
  }

  private async validateReferences(data: Record<string, unknown>) {
    if (data.category_id) {
      const rows = await this.db.db
        .select({ id: refPartnerCategories.id })
        .from(refPartnerCategories)
        .where(eq(refPartnerCategories.id, String(data.category_id)))
        .limit(1);
      if (rows.length === 0) {
        throw new ConflictException('Указанная категория контрагента не найдена');
      }
    }
    if (data.partner_economic_category_id) {
      const rows = await this.db.db
        .select({ id: refPartnerEconomicCategories.id })
        .from(refPartnerEconomicCategories)
        .where(eq(refPartnerEconomicCategories.id, String(data.partner_economic_category_id)))
        .limit(1);
      if (rows.length === 0) {
        throw new ConflictException('Указанная экономическая категория не найдена');
      }
    }
    const typeIds = Array.isArray(data.type_ids) ? data.type_ids.filter((x): x is string => typeof x === 'string') : [];
    if (typeIds.length) {
      const rows = await this.db.db
        .select({ id: refPartnerTypes.id })
        .from(refPartnerTypes)
        .where(inArray(refPartnerTypes.id, typeIds));
      if (rows.length !== typeIds.length) {
        throw new ConflictException('Один или несколько типов контрагента не найдены');
      }
    }
    const competenceIds = Array.isArray(data.competence_ids) ? data.competence_ids.filter((x): x is string => typeof x === 'string') : [];
    if (competenceIds.length) {
      const rows = await this.db.db
        .select({ id: refPartnerCompetencies.id })
        .from(refPartnerCompetencies)
        .where(inArray(refPartnerCompetencies.id, competenceIds));
      if (rows.length !== competenceIds.length) {
        throw new ConflictException('Одна или несколько компетенций не найдены');
      }
    }
  }

  private validateInnKppRequired(data: Record<string, unknown>) {
    const inn = data.inn != null ? String(data.inn).trim() : '';
    const kpp = data.kpp != null ? String(data.kpp).trim() : '';
    if (!inn) {
      throw new ConflictException('ИНН обязателен для заполнения');
    }
    if (!kpp) {
      throw new ConflictException('КПП обязателен для заполнения');
    }
  }

  private async checkInnKppUnique(inn: string | null, kpp: string | null, excludePartnerId?: string) {
    const innVal = inn && inn.trim() ? inn.trim() : null;
    const kppVal = kpp && kpp.trim() ? kpp.trim() : null;
    const conditions = [
      sql`${partners.inn} IS NOT DISTINCT FROM ${innVal}`,
      sql`${partners.kpp} IS NOT DISTINCT FROM ${kppVal}`,
    ];
    if (excludePartnerId) {
      conditions.push(ne(partners.id, excludePartnerId));
    }
    const existing = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(and(...conditions, eq(partners.isDeleted, false)))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException(
        'Контрагент с такой комбинацией ИНН и КПП уже существует',
      );
    }
  }

  private mapToDb(data: Record<string, unknown>) {
    const toUuid = (value: unknown): string | null =>
      value == null || value === '' ? null : typeof value === 'string' ? value : null;
    const toBool = (value: unknown): boolean | undefined =>
      value === true || value === 'true' ? true : value === false || value === 'false' ? false : undefined;

    const isKeySupplier = toBool(data.is_key_supplier);
    const isTargeted = toBool(data.is_targeted);
    const legalCheckPassed = toBool(data.legal_check_passed);
    const questionnaireFilled = toBool(data.questionnaire_filled);
    const initialAssessmentDone = toBool(data.initial_assessment_done);

    return {
      name: data.name != null ? String(data.name) : null,
      shortName: data.short_name != null ? String(data.short_name) : null,
      inn: data.inn != null ? String(data.inn) : null,
      kpp: data.kpp != null ? String(data.kpp) : null,
      ogrn: data.ogrn != null ? String(data.ogrn) : null,
      legalAddress: data.legal_address != null ? String(data.legal_address) : null,
      actualAddress: data.actual_address != null ? String(data.actual_address) : null,
      phone: data.phone != null ? String(data.phone) : null,
      email: data.email != null ? String(data.email) : null,
      website: data.website != null ? String(data.website) : null,
      categoryId: toUuid(data.category_id),
      comment: data.comment != null ? String(data.comment) : null,
      partnerEconomicCategoryId: toUuid(data.partner_economic_category_id),
      ...(isKeySupplier !== undefined && { isKeySupplier }),
      ...(isTargeted !== undefined && { isTargeted }),
      ...(legalCheckPassed !== undefined && { legalCheckPassed }),
      ...(questionnaireFilled !== undefined && { questionnaireFilled }),
      ...(initialAssessmentDone !== undefined && { initialAssessmentDone }),
      ...(data.rating !== undefined && { rating: data.rating != null ? String(data.rating) : null }),
      ...(data.next_audit_date !== undefined && { nextAuditDate: data.next_audit_date != null ? String(data.next_audit_date) : null }),
    };
  }

  private parseManualArchiveFlag(data: Record<string, unknown>): boolean | undefined {
    if (!('manual_archive' in data) || data.manual_archive === undefined) return undefined;
    const manualArchiveRaw = data.manual_archive;
    if (manualArchiveRaw === true || manualArchiveRaw === 'true') return true;
    if (manualArchiveRaw === false || manualArchiveRaw === 'false') return false;
    return undefined;
  }

  private async getPartnerStatusName(statusId: string | null | undefined): Promise<string | null> {
    if (!statusId) return null;
    const nameRows = await this.db.db
      .select({ name: refPartnerStatuses.name })
      .from(refPartnerStatuses)
      .where(eq(refPartnerStatuses.id, statusId))
      .limit(1);
    return nameRows[0]?.name?.trim() ?? null;
  }

  async isPartnerInArchiveStatus(partnerId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ statusId: partners.statusId })
      .from(partners)
      .where(and(eq(partners.id, partnerId), eq(partners.isDeleted, false)))
      .limit(1);
    if (!rows[0]) return false;
    const name = await this.getPartnerStatusName(rows[0].statusId ? String(rows[0].statusId) : null);
    return (name ?? '').trim() === 'Архив';
  }

  private async resolvePartnerOperationalStatusIds(): Promise<{
    activeId: string;
    potentialId: string;
    blockedId: string;
    archiveId: string;
  }> {
    const rows = await this.db.db
      .select({ id: refPartnerStatuses.id, name: refPartnerStatuses.name })
      .from(refPartnerStatuses);
    const byLower = new Map<string, string>();
    for (const statusRow of rows) {
      const normalizedStatusKey = (statusRow.name ?? '').trim().toLowerCase();
      if (normalizedStatusKey) byLower.set(normalizedStatusKey, String(statusRow.id));
    }
    const need = (ru: string) => {
      const id = byLower.get(ru.toLowerCase());
      if (!id) {
        throw new InternalServerErrorException(`В ref_partner_statuses не найден статус «${ru}»`);
      }
      return id;
    };
    return {
      activeId: need('Активный'),
      potentialId: need('Потенциальный'),
      blockedId: need('Заблокирован'),
      archiveId: need('Архив'),
    };
  }

  private async exitArchiveStatus(partnerId: string, userId?: string): Promise<void> {
    const ids = await this.resolvePartnerOperationalStatusIds();
    const nextStatusId = await this.computeAutoStatusIdForPartnerRow(partnerId, ids);
    await this.db.db
      .update(partners)
      .set({
        statusId: nextStatusId,
        updatedAt: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      })
      .where(eq(partners.id, partnerId));
  }

  private async partnerHasAtLeastOneEffectiveContract(partnerId: string): Promise<boolean> {
    const contractRows = await this.db.db
      .select({ id: contracts.id })
      .from(contracts)
      .where(
        and(
          eq(contracts.partnerId, partnerId),
          eq(contracts.isDeleted, false),
          eq(contracts.isActive, true),
        )!,
      )
      .limit(1);
    return contractRows.length > 0;
  }

  private isoDateOnlyEval(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private async partnerAvgWeightedScoreFromActiveEvaluations(partnerId: string): Promise<number | null> {
    const evalRows = await this.db.db
      .select({
        projectId: supplierEvaluations.projectId,
        evaluatedAt: supplierEvaluations.evaluatedAt,
        weightedScore: supplierEvaluations.weightedScore,
      })
      .from(supplierEvaluations)
      .where(and(eq(supplierEvaluations.partnerId, partnerId), eq(supplierEvaluations.status, 'active'))!);

    type EvalPick = (typeof evalRows)[number];
    const byProject = new Map<string, EvalPick>();
    for (const evaluationRow of evalRows) {
      const projectIdKey = String(evaluationRow.projectId);
      const prev = byProject.get(projectIdKey);
      const evAt = this.isoDateOnlyEval(evaluationRow.evaluatedAt);
      const prevAt = prev ? this.isoDateOnlyEval(prev.evaluatedAt) : '';
      if (!prev || evAt > prevAt) {
        byProject.set(projectIdKey, evaluationRow);
      }
    }
    const perProject = [...byProject.values()];
    if (perProject.length === 0) return null;
    const sum = perProject.reduce((acc, row) => acc + Number(row.weightedScore), 0);
    return Math.round((sum / perProject.length) * 100) / 100;
  }

  private async computeAutoStatusIdForPartnerRow(
    partnerId: string,
    ids: { activeId: string; potentialId: string; blockedId: string },
  ): Promise<string> {
    const avg = await this.partnerAvgWeightedScoreFromActiveEvaluations(partnerId);
    if (avg !== null && avg < 2) {
      return ids.blockedId;
    }
    const hasEffective = await this.partnerHasAtLeastOneEffectiveContract(partnerId);
    if (hasEffective) {
      return ids.activeId;
    }
    return ids.potentialId;
  }

  private async applyDerivedPartnerStatus(
    partnerId: string,
    opts: { ignoreArchiveLock: boolean },
  ): Promise<void> {
    if (!this.isOperationalStatusDeriveEnabled()) {
      return;
    }
    const partnerRows = await this.db.db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    const partnerRow = partnerRows[0];
    if (!partnerRow) return;

    const ids = await this.resolvePartnerOperationalStatusIds();
    const statusName = await this.getPartnerStatusName(partnerRow.statusId ? String(partnerRow.statusId) : null);
    if (statusName === 'Архив' && !opts.ignoreArchiveLock) {
      return;
    }

    const curId = partnerRow.statusId ? String(partnerRow.statusId) : null;
    const nextId = await this.computeAutoStatusIdForPartnerRow(partnerId, ids);
    if (curId !== nextId) {
      await this.db.db
        .update(partners)
        .set({ statusId: nextId, updatedAt: new Date() })
        .where(eq(partners.id, partnerId));
    }
  }

  private partnerApprovalExtras(
    row: typeof partners.$inferSelect,
    categoryName: string | null,
    hasActiveEvaluationBlock: boolean,
    hasInitialEvalRecord: boolean,
  ): { isApproved: boolean; hasActiveEvaluationBlock: boolean } {
    const isApproved = computePartnerIsApproved({
      kind: inferPartnerCategoryKind(categoryName),
      legalCheckPassed: !!(row.legalCheckPassed ?? false),
      questionnaireFilled: !!(row.questionnaireFilled ?? false),
      initialAssessmentDone: !!(row.initialAssessmentDone ?? false) || hasInitialEvalRecord,
      hasActiveSupplierEvaluationBlock: hasActiveEvaluationBlock,
    });
    return { isApproved, hasActiveEvaluationBlock: hasActiveEvaluationBlock };
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
    return new Set(blockRows.map((b) => String(b.partnerId)));
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
    return new Set(rows.map((row) => String(row.partnerId)));
  }

  private async loadActiveEvaluationFactsByPartnerId(
    partnerIds: string[],
  ): Promise<Map<string, { hasActive: boolean; hasOverdue: boolean }>> {
    const map = new Map<string, { hasActive: boolean; hasOverdue: boolean }>();
    if (partnerIds.length === 0) return map;
    const rows = await this.db.db
      .select({
        partnerId: supplierEvaluations.partnerId,
        hasActive: sql<boolean>`count(*) > 0`,
        hasOverdue:
          sql<boolean>`bool_or(${supplierEvaluations.nextReevaluationDate} is not null and ${supplierEvaluations.nextReevaluationDate} < CURRENT_DATE)`,
      })
      .from(supplierEvaluations)
      .where(and(inArray(supplierEvaluations.partnerId, partnerIds), eq(supplierEvaluations.status, 'active'))!)
      .groupBy(supplierEvaluations.partnerId);
    for (const row of rows) {
      map.set(String(row.partnerId), {
        hasActive: Boolean(row.hasActive),
        hasOverdue: Boolean(row.hasOverdue),
      });
    }
    return map;
  }

  private computeEvaluationRequiredForPartner(params: {
    statusId: string | null;
    categoryName: string | null;
    isApproved: boolean;
    hasActiveEvaluation: boolean;
    hasOverdueEvaluation: boolean;
    statusIds: { activeId: string; potentialId: string };
  }): PartnerEvaluationRequiredValue {
    const isEngineering = inferPartnerCategoryKind(params.categoryName) === 'engineering';
    const isActiveEngineering = isEngineering && params.statusId === params.statusIds.activeId;
    const isPotentialApprovedEngineering =
      isEngineering && params.statusId === params.statusIds.potentialId && params.isApproved;
    const isRequiredPartner = isActiveEngineering || isPotentialApprovedEngineering;
    if (!isRequiredPartner) return 'none';
    if (!params.hasActiveEvaluation) return 'missing';
    if (params.hasOverdueEvaluation) return 'overdue';
    return 'none';
  }

  private toResponse(
    row: (typeof partners.$inferSelect),
    extras: {
      isApproved: boolean;
      hasActiveEvaluationBlock: boolean;
      evaluationRequired: PartnerEvaluationRequiredValue;
    },
  ) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      short_name: row.shortName ?? '',
      inn: row.inn ?? '',
      kpp: row.kpp ?? '',
      ogrn: row.ogrn ?? '',
      legal_address: row.legalAddress ?? '',
      actual_address: row.actualAddress ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      status_id: row.statusId ? String(row.statusId) : '',
      category_id: row.categoryId ? String(row.categoryId) : '',
      comment: row.comment ?? '',
      partner_economic_category_id: row.partnerEconomicCategoryId ? String(row.partnerEconomicCategoryId) : '',
      is_key_supplier: row.isKeySupplier ?? false,
      is_targeted: row.isTargeted ?? false,
      legal_check_passed: row.legalCheckPassed ?? false,
      questionnaire_filled: row.questionnaireFilled ?? false,
      initial_assessment_done: row.initialAssessmentDone ?? false,
      is_approved: extras.isApproved,
      has_active_evaluation_block: extras.hasActiveEvaluationBlock,
      evaluation_required: extras.evaluationRequired,
      rating: row.rating ? Number(row.rating) : null,
      next_audit_date: row.nextAuditDate ?? null,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
      is_deleted: row.isDeleted ?? false,
    };
  }
}
