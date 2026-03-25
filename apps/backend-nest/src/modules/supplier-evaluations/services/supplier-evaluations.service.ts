import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  contracts,
  partners,
  projects,
  refSupplierEvaluationCriteria,
  supplierEvaluationCriterionScores,
  supplierEvaluations,
  supplierPartnerProjectBlocks,
  users,
} from '../../../database/schema';
import type { PaginationParams } from '../../../common/pagination';
import { SUPPLIER_BLOCK_REASONS } from '../domain/supplier-evaluation.enums';
import type { SupplierEvaluationCategory } from '../domain/supplier-evaluation.enums';
import {
  REEVALUATION_SOON_WINDOW_DAYS,
  categoryFromWeightedScore,
  nextReevaluationDateForCategory,
} from '../domain/supplier-evaluation.rules';
import type { CreateSupplierEvaluationDto } from '../dto';

export type SupplierEvaluationListStatusFilter = 'active' | 'archived' | 'all';

/** Уточнение по смыслу строки для реестра (см. макет фильтров). */
export type SupplierEvaluationUiStatusFilter =
  | 'all'
  | 'current'
  | 'archived'
  | 'blocked'
  | 'overdue'
  | 'reeval_soon';

export type SupplierEvaluationListSortField = 'evaluated_at' | 'weighted_score';
export type SupplierEvaluationListSortDir = 'asc' | 'desc';

export interface SupplierEvaluationQueryFilters {
  partnerId?: string;
  projectId?: string;
  status: SupplierEvaluationListStatusFilter;
  createdBy?: string;
  category?: SupplierEvaluationCategory;
  /** Календарный год даты evaluated_at (игнорируется, если задан диапазон evaluatedAtFrom / evaluatedAtTo). */
  evaluatedYear?: number;
  /** Нижняя граница evaluated_at (YYYY-MM-DD), включительно */
  evaluatedAtFrom?: string;
  /** Верхняя граница evaluated_at (YYYY-MM-DD), включительно */
  evaluatedAtTo?: string;
  uiStatus?: SupplierEvaluationUiStatusFilter;
  sortField?: SupplierEvaluationListSortField;
  sortDir?: SupplierEvaluationListSortDir;
}

/** Без ui_status и пагинации — для счётчиков вкладок реестра. */
export interface SupplierEvaluationTabCountFilters {
  partnerId?: string;
  projectId?: string;
  createdBy?: string;
  category?: SupplierEvaluationCategory;
  evaluatedYear?: number;
  evaluatedAtFrom?: string;
  evaluatedAtTo?: string;
}

export type SupplierEvaluationTabCounts = Record<SupplierEvaluationUiStatusFilter, number>;

const UI_TAB_COUNT_KEYS: SupplierEvaluationUiStatusFilter[] = [
  'all',
  'current',
  'archived',
  'blocked',
  'overdue',
  'reeval_soon',
];

@Injectable()
export class SupplierEvaluationsService {
  private readonly logger = new Logger(SupplierEvaluationsService.name);

  constructor(private readonly db: DatabaseService) {}

  /** Проекты из неудалённых договоров с контрагентом (для селекта «Новая оценка»). */
  async findContractProjectOptionsForPartner(partnerId: string) {
    const rows = await this.db.db
      .select({
        id: projects.id,
        name: projects.name,
        code: projects.code,
      })
      .from(contracts)
      .innerJoin(projects, eq(contracts.projectId, projects.id))
      .where(
        and(
          eq(contracts.partnerId, partnerId),
          eq(contracts.isDeleted, false),
          eq(projects.isDeleted, false),
        )!,
      )
      .groupBy(projects.id, projects.name, projects.code)
      .orderBy(asc(projects.name));

    return rows.map((r) => ({
      id: String(r.id),
      label: (r.name ?? r.code ?? String(r.id)).trim() || String(r.id),
    }));
  }

  async deleteEvaluation(evaluationId: string) {
    const existing = await this.db.db
      .select({ id: supplierEvaluations.id })
      .from(supplierEvaluations)
      .where(eq(supplierEvaluations.id, evaluationId))
      .limit(1);
    if (!existing[0]) {
      throw new NotFoundException(`Оценка ${evaluationId} не найдена`);
    }

    await this.db.db.transaction(async (tx) => {
      await tx
        .delete(supplierEvaluationCriterionScores)
        .where(eq(supplierEvaluationCriterionScores.evaluationId, evaluationId));
      await tx
        .update(supplierPartnerProjectBlocks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(supplierPartnerProjectBlocks.sourceEvaluationId, evaluationId));
      await tx.delete(supplierEvaluations).where(eq(supplierEvaluations.id, evaluationId));
    });
  }

  async findCriteriaCatalog() {
    const rows = await this.db.db
      .select()
      .from(refSupplierEvaluationCriteria)
      .where(eq(refSupplierEvaluationCriteria.isActive, true))
      .orderBy(asc(refSupplierEvaluationCriteria.sortOrder), asc(refSupplierEvaluationCriteria.code));

    return rows.map((row) => this.criteriaToResponse(row));
  }

  async findAll(pagination: PaginationParams, filters: SupplierEvaluationQueryFilters) {
    const { limit, offset } = pagination;
    const whereClause = this.buildListWhere(filters);
    const listWhere = whereClause ?? sql`true`;

    const total = await this.countMatchingWhere(listWhere);

    const sortField = filters.sortField ?? 'evaluated_at';
    const sortDir = filters.sortDir ?? 'desc';
    const primaryCol =
      sortField === 'weighted_score' ? supplierEvaluations.weightedScore : supplierEvaluations.evaluatedAt;
    const primaryOrder = sortDir === 'asc' ? asc(primaryCol) : desc(primaryCol);
    const tieBreaker = sortDir === 'asc' ? asc(supplierEvaluations.createdAt) : desc(supplierEvaluations.createdAt);

    const rows = await this.db.db
      .select({
        ev: supplierEvaluations,
        creatorLastName: users.lastName,
        creatorFirstName: users.firstName,
        creatorMiddleName: users.middleName,
      })
      .from(supplierEvaluations)
      .leftJoin(users, eq(supplierEvaluations.createdBy, users.id))
      .where(listWhere)
      .orderBy(primaryOrder, tieBreaker)
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map((r) =>
        this.evaluationToResponse(r.ev, {
          lastName: r.creatorLastName,
          firstName: r.creatorFirstName,
          middleName: r.creatorMiddleName,
        }),
      ),
      total,
    };
  }

  /** Число строк по каждой вкладке смысла (те же фильтры, что у списка, кроме ui_status). Поиска по тексту нет. */
  async findTabCounts(filters: SupplierEvaluationTabCountFilters): Promise<SupplierEvaluationTabCounts> {
    const base: Omit<SupplierEvaluationQueryFilters, 'uiStatus'> = {
      partnerId: filters.partnerId,
      projectId: filters.projectId,
      createdBy: filters.createdBy,
      category: filters.category,
      evaluatedYear: filters.evaluatedYear,
      evaluatedAtFrom: filters.evaluatedAtFrom,
      evaluatedAtTo: filters.evaluatedAtTo,
      status: 'all',
    };
    const entries = await Promise.all(
      UI_TAB_COUNT_KEYS.map(async (key) => {
        const listFilters: SupplierEvaluationQueryFilters = {
          ...base,
          uiStatus: key === 'all' ? undefined : key,
        };
        const whereClause = this.buildListWhere(listFilters);
        const listWhere = whereClause ?? sql`true`;
        const n = await this.countMatchingWhere(listWhere);
        return [key, n] as const;
      }),
    );
    return Object.fromEntries(entries) as SupplierEvaluationTabCounts;
  }

  private async countMatchingWhere(listWhere: SQL): Promise<number> {
    const countRow = await this.db.db
      .select({ value: count() })
      .from(supplierEvaluations)
      .where(listWhere);
    return Number(countRow[0]?.value ?? 0);
  }

  async findOne(id: string) {
    const head = await this.db.db
      .select({
        ev: supplierEvaluations,
        creatorLastName: users.lastName,
        creatorFirstName: users.firstName,
        creatorMiddleName: users.middleName,
      })
      .from(supplierEvaluations)
      .leftJoin(users, eq(supplierEvaluations.createdBy, users.id))
      .where(eq(supplierEvaluations.id, id))
      .limit(1);
    const row = head[0];
    if (!row) return null;
    const evaluation = row.ev;

    const scoreRows = await this.db.db
      .select({
        id: supplierEvaluationCriterionScores.id,
        criterion_id: supplierEvaluationCriterionScores.criterionId,
        score: supplierEvaluationCriterionScores.score,
        criterion_code: refSupplierEvaluationCriteria.code,
        criterion_name: refSupplierEvaluationCriteria.name,
        criterion_weight: refSupplierEvaluationCriteria.weight,
        sort_order: refSupplierEvaluationCriteria.sortOrder,
      })
      .from(supplierEvaluationCriterionScores)
      .innerJoin(
        refSupplierEvaluationCriteria,
        eq(supplierEvaluationCriterionScores.criterionId, refSupplierEvaluationCriteria.id),
      )
      .where(eq(supplierEvaluationCriterionScores.evaluationId, id))
      .orderBy(asc(refSupplierEvaluationCriteria.sortOrder));

    return {
      ...this.evaluationToResponse(evaluation, {
        lastName: row.creatorLastName,
        firstName: row.creatorFirstName,
        middleName: row.creatorMiddleName,
      }),
      scores: scoreRows.map((s) => ({
        id: String(s.id),
        criterion_id: String(s.criterion_id),
        score: this.roundScore(Number(s.score)),
        criterion_code: s.criterion_code ?? '',
        criterion_name: s.criterion_name ?? '',
        criterion_weight: Number(s.criterion_weight),
        sort_order: s.sort_order,
        weighted_line:
          Math.round(Number(s.score) * Number(s.criterion_weight) * 1000) / 1000,
      })),
    };
  }

  async create(dto: CreateSupplierEvaluationDto, createdByUserId?: string) {
    this.validateEvaluatedAt(dto.evaluated_at);

    await this.assertPartnerAndProjectExist(dto.partner_id, dto.project_id);
    await this.assertProjectLinkedViaPartnerContracts(dto.partner_id, dto.project_id);

    const criteriaRows = await this.db.db
      .select()
      .from(refSupplierEvaluationCriteria)
      .where(eq(refSupplierEvaluationCriteria.isActive, true));

    if (criteriaRows.length === 0) {
      throw new BadRequestException('В справочнике нет активных критериев оценки');
    }

    const criterionIds = new Set(criteriaRows.map((c) => String(c.id)));
    const seen = new Set<string>();
    for (const s of dto.scores) {
      if (seen.has(s.criterion_id)) {
        throw new BadRequestException(`Критерий ${s.criterion_id} указан более одного раза`);
      }
      seen.add(s.criterion_id);
      if (!criterionIds.has(s.criterion_id)) {
        throw new BadRequestException(`Неизвестный или неактивный критерий: ${s.criterion_id}`);
      }
    }

    if (seen.size !== criterionIds.size) {
      throw new BadRequestException(
        `Нужен ровно один балл по каждому активному критерию (ожидается ${criterionIds.size})`,
      );
    }

    const weightById = new Map(criteriaRows.map((c) => [String(c.id), Number(c.weight)]));
    let weighted = 0;
    for (const s of dto.scores) {
      weighted += s.score * (weightById.get(s.criterion_id) ?? 0);
    }
    weighted = Math.round(weighted * 100) / 100;

    const category = categoryFromWeightedScore(weighted);
    const nextReevaluation = nextReevaluationDateForCategory(dto.evaluated_at, category);

    const createdBy = createdByUserId ?? null;

    try {
      const result = await this.db.db.transaction(async (tx) => {
        await tx
          .update(supplierEvaluations)
          .set({ status: 'archived', updatedAt: new Date() })
          .where(
            and(
              eq(supplierEvaluations.partnerId, dto.partner_id),
              eq(supplierEvaluations.projectId, dto.project_id),
              eq(supplierEvaluations.status, 'active'),
            )!,
          );

        const [inserted] = await tx
          .insert(supplierEvaluations)
          .values({
            partnerId: dto.partner_id,
            projectId: dto.project_id,
            status: 'active',
            weightedScore: String(weighted),
            category,
            evaluatedAt: dto.evaluated_at,
            nextReevaluationDate: nextReevaluation,
            comment: dto.comment ?? null,
            createdBy,
            updatedBy: createdBy,
          })
          .returning();

        if (!inserted) {
          throw new Error('INSERT supplier_evaluations не вернул строку');
        }

        const evaluationId = inserted.id;

        await tx.insert(supplierEvaluationCriterionScores).values(
          dto.scores.map((s) => ({
            evaluationId,
            criterionId: s.criterion_id,
            score: String(s.score),
          })),
        );

        if (category === 'D') {
          await tx
            .update(supplierPartnerProjectBlocks)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                eq(supplierPartnerProjectBlocks.partnerId, dto.partner_id),
                eq(supplierPartnerProjectBlocks.projectId, dto.project_id),
                eq(supplierPartnerProjectBlocks.isActive, true),
              )!,
            );

          await tx.insert(supplierPartnerProjectBlocks).values({
            partnerId: dto.partner_id,
            projectId: dto.project_id,
            sourceEvaluationId: evaluationId,
            reason: SUPPLIER_BLOCK_REASONS.evaluationCategoryD,
            isActive: true,
          });
        }

        return inserted;
      });

      return await this.findOne(String(result.id));
    } catch (err) {
      this.logger.warn(`Ошибка создания оценки: ${err}`);
      throw err;
    }
  }

  async findActiveBlock(partnerId: string, projectId: string) {
    const rows = await this.db.db
      .select()
      .from(supplierPartnerProjectBlocks)
      .where(
        and(
          eq(supplierPartnerProjectBlocks.partnerId, partnerId),
          eq(supplierPartnerProjectBlocks.projectId, projectId),
          eq(supplierPartnerProjectBlocks.isActive, true),
        )!,
      )
      .limit(1);
    const row = rows[0];
    return row ? this.blockToResponse(row) : null;
  }

  async deactivateBlock(blockId: string, updatedByUserId?: string) {
    const rows = await this.db.db
      .select()
      .from(supplierPartnerProjectBlocks)
      .where(eq(supplierPartnerProjectBlocks.id, blockId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    await this.db.db
      .update(supplierPartnerProjectBlocks)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(supplierPartnerProjectBlocks.id, blockId));

    this.logger.log(
      `Блокировка ${blockId} снята${updatedByUserId ? ` пользователем ${updatedByUserId}` : ''}`,
    );

    const updated = await this.db.db
      .select()
      .from(supplierPartnerProjectBlocks)
      .where(eq(supplierPartnerProjectBlocks.id, blockId))
      .limit(1);
    return updated[0] ? this.blockToResponse(updated[0]) : null;
  }

  private buildListWhere(filters: SupplierEvaluationQueryFilters): SQL | undefined {
    const parts: SQL[] = [];
    if (filters.partnerId) {
      parts.push(eq(supplierEvaluations.partnerId, filters.partnerId));
    }
    if (filters.projectId) {
      parts.push(eq(supplierEvaluations.projectId, filters.projectId));
    }
    if (filters.createdBy) {
      parts.push(eq(supplierEvaluations.createdBy, filters.createdBy));
    }
    if (filters.category) {
      parts.push(eq(supplierEvaluations.category, filters.category));
    }
    const hasDateRange = Boolean(filters.evaluatedAtFrom?.trim() || filters.evaluatedAtTo?.trim());
    if (hasDateRange) {
      const from = filters.evaluatedAtFrom?.trim();
      const to = filters.evaluatedAtTo?.trim();
      if (from) parts.push(gte(supplierEvaluations.evaluatedAt, from));
      if (to) parts.push(lte(supplierEvaluations.evaluatedAt, to));
    } else if (filters.evaluatedYear != null && Number.isFinite(filters.evaluatedYear)) {
      const y = filters.evaluatedYear;
      parts.push(gte(supplierEvaluations.evaluatedAt, `${y}-01-01`));
      parts.push(lte(supplierEvaluations.evaluatedAt, `${y}-12-31`));
    }

    const ui = filters.uiStatus ?? 'all';
    if (ui === 'archived') {
      parts.push(eq(supplierEvaluations.status, 'archived'));
    } else if (ui !== 'all') {
      parts.push(eq(supplierEvaluations.status, 'active'));
      switch (ui) {
        case 'blocked':
          parts.push(eq(supplierEvaluations.category, 'D'));
          parts.push(isNull(supplierEvaluations.nextReevaluationDate));
          break;
        case 'overdue':
          parts.push(isNotNull(supplierEvaluations.nextReevaluationDate));
          parts.push(sql`${supplierEvaluations.nextReevaluationDate} < CURRENT_DATE`);
          break;
        case 'reeval_soon':
          parts.push(isNotNull(supplierEvaluations.nextReevaluationDate));
          parts.push(sql`${supplierEvaluations.nextReevaluationDate} >= CURRENT_DATE`);
          parts.push(
            sql`${supplierEvaluations.nextReevaluationDate} <= CURRENT_DATE + (${REEVALUATION_SOON_WINDOW_DAYS}::integer * INTERVAL '1 day')`,
          );
          break;
        case 'current':
          parts.push(
            sql`NOT (${supplierEvaluations.category} = 'D' AND ${supplierEvaluations.nextReevaluationDate} IS NULL)`,
          );
          parts.push(
            sql`(${supplierEvaluations.nextReevaluationDate} IS NULL OR ${supplierEvaluations.nextReevaluationDate} > CURRENT_DATE + (${REEVALUATION_SOON_WINDOW_DAYS}::integer * INTERVAL '1 day'))`,
          );
          break;
        default:
          break;
      }
    } else {
      if (filters.status === 'active') {
        parts.push(eq(supplierEvaluations.status, 'active'));
      } else if (filters.status === 'archived') {
        parts.push(eq(supplierEvaluations.status, 'archived'));
      }
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts)!;
  }

  private formatCreatorName(parts: {
    lastName?: string | null;
    firstName?: string | null;
    middleName?: string | null;
  }): string {
    const s = [parts.lastName, parts.firstName, parts.middleName].filter(Boolean).join(' ').trim();
    return s || '';
  }

  private async assertPartnerAndProjectExist(partnerId: string, projectId: string) {
    const [p] = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(and(eq(partners.id, partnerId), eq(partners.isDeleted, false)))
      .limit(1);
    if (!p) {
      throw new BadRequestException('Контрагент не найден или удалён');
    }
    const [pr] = await this.db.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.isDeleted, false)))
      .limit(1);
    if (!pr) {
      throw new BadRequestException('Проект не найден или удалён');
    }
  }

  /** Оценка допускается только по проектам, с которыми у контрагента есть договор. */
  private async assertProjectLinkedViaPartnerContracts(partnerId: string, projectId: string) {
    const allowed = await this.findContractProjectOptionsForPartner(partnerId);
    if (!allowed.some((o) => o.id === projectId)) {
      throw new BadRequestException(
        'Выберите проект из договоров с этим контрагентом. Проект не найден среди связей по договорам.',
      );
    }
  }

  private validateEvaluatedAt(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      throw new BadRequestException('evaluated_at должен быть в формате YYYY-MM-DD');
    }
  }

  private criteriaToResponse(row: typeof refSupplierEvaluationCriteria.$inferSelect) {
    return {
      id: String(row.id),
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      weight: Number(row.weight),
      sort_order: row.sortOrder,
      is_active: row.isActive,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }

  private evaluationToResponse(
    row: typeof supplierEvaluations.$inferSelect,
    creator?: {
      lastName?: string | null;
      firstName?: string | null;
      middleName?: string | null;
    },
  ) {
    const createdByName = creator ? this.formatCreatorName(creator) : '';
    return {
      id: String(row.id),
      partner_id: String(row.partnerId),
      project_id: String(row.projectId),
      status: row.status,
      weighted_score: this.roundScore(Number(row.weightedScore)),
      category: row.category as SupplierEvaluationCategory,
      evaluated_at: row.evaluatedAt ? String(row.evaluatedAt) : '',
      next_reevaluation_date: row.nextReevaluationDate ? String(row.nextReevaluationDate) : null,
      comment: row.comment ?? '',
      created_by: row.createdBy ? String(row.createdBy) : '',
      created_by_name: createdByName,
      updated_by: row.updatedBy ? String(row.updatedBy) : '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }

  private blockToResponse(row: typeof supplierPartnerProjectBlocks.$inferSelect) {
    return {
      id: String(row.id),
      partner_id: String(row.partnerId),
      project_id: String(row.projectId),
      source_evaluation_id: row.sourceEvaluationId ? String(row.sourceEvaluationId) : '',
      reason: row.reason ?? '',
      is_active: row.isActive,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }

  private roundScore(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
