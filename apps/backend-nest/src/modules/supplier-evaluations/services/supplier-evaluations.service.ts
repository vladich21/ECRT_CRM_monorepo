import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { PartnersService } from '../../partners/services/partners.service';
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
import type { CreateInitialSupplierEvaluationDto, CreateSupplierEvaluationDto } from '../dto';

const EVAL_SCOPE_PROJECT = 'project';
const EVAL_SCOPE_INITIAL = 'initial';

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

  constructor(
    private readonly db: DatabaseService,
    private readonly partnersService: PartnersService,
  ) {}

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

  /**
   * Сводка для карточки контрагента в реестре: KPI по активным оценкам, просрочка плановой
   * переоценки, число проектов с активной блокировкой по оценке (кат. D).
   */
  async findPartnerEvalSummary(partnerId: string) {
    const today = this.calendarTodayIso();
    const [blockRows, evalRows] = await Promise.all([
      this.db.db
        .select({ projectId: supplierPartnerProjectBlocks.projectId })
        .from(supplierPartnerProjectBlocks)
        .where(
          and(
            eq(supplierPartnerProjectBlocks.partnerId, partnerId),
            eq(supplierPartnerProjectBlocks.isActive, true),
          )!,
        ),
      this.db.db
        .select({
          projectId: supplierEvaluations.projectId,
          evaluatedAt: supplierEvaluations.evaluatedAt,
          weightedScore: supplierEvaluations.weightedScore,
          nextReevaluationDate: supplierEvaluations.nextReevaluationDate,
        })
        .from(supplierEvaluations)
        .where(
          and(
            eq(supplierEvaluations.partnerId, partnerId),
            eq(supplierEvaluations.scope, EVAL_SCOPE_PROJECT),
            eq(supplierEvaluations.status, 'active'),
          )!,
        ),
    ]);

    const blockedProjectCount = new Set(blockRows.map((r) => String(r.projectId))).size;

    type EvalPick = (typeof evalRows)[number];
    const byProject = new Map<string, EvalPick>();
    for (const r of evalRows) {
      const pid = String(r.projectId);
      const prev = byProject.get(pid);
      const evAt = this.isoDateOnly(r.evaluatedAt);
      const prevAt = prev ? this.isoDateOnly(prev.evaluatedAt) : '';
      if (!prev || evAt > prevAt) {
        byProject.set(pid, r);
      }
    }
    const perProject = [...byProject.values()];

    let avgScore: number | null = null;
    let nextReevaluationDate: string | null = null;
    if (perProject.length > 0) {
      const sum = perProject.reduce((acc, r) => acc + Number(r.weightedScore), 0);
      avgScore = Math.round((sum / perProject.length) * 100) / 100;
      const dates = perProject
        .map((r) => (r.nextReevaluationDate ? this.isoDateOnly(r.nextReevaluationDate) : null))
        .filter((d): d is string => Boolean(d));
      nextReevaluationDate = dates.length === 0 ? null : dates.reduce((a, b) => (a <= b ? a : b));
    }

    const nextReevaluationOverdue =
      nextReevaluationDate != null && nextReevaluationDate.length >= 10 && nextReevaluationDate < today;

    return {
      avg_score: avgScore,
      next_reevaluation_date: nextReevaluationDate,
      next_reevaluation_overdue: nextReevaluationOverdue,
      blocked_project_count: blockedProjectCount,
    };
  }

  private calendarTodayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private isoDateOnly(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  }

  async deleteEvaluation(evaluationId: string) {
    const existing = await this.db.db
      .select({ id: supplierEvaluations.id, partnerId: supplierEvaluations.partnerId })
      .from(supplierEvaluations)
      .where(eq(supplierEvaluations.id, evaluationId))
      .limit(1);
    if (!existing[0]) {
      throw new NotFoundException(`Оценка ${evaluationId} не найдена`);
    }
    const partnerId = String(existing[0].partnerId);

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

    await this.partnersService.refreshPartnerDerivedStatus(partnerId);
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
              eq(supplierEvaluations.scope, EVAL_SCOPE_PROJECT),
              eq(supplierEvaluations.status, 'active'),
            )!,
          );

        const [inserted] = await tx
          .insert(supplierEvaluations)
          .values({
            partnerId: dto.partner_id,
            projectId: dto.project_id,
            scope: EVAL_SCOPE_PROJECT,
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

      const created = await this.findOne(String(result.id));
      await this.partnersService.refreshPartnerDerivedStatus(dto.partner_id);
      return created;
    } catch (err) {
      this.logger.warn(`Ошибка создания оценки: ${err}`);
      throw err;
    }
  }

  async findActiveInitial(partnerId: string) {
    const rows = await this.db.db
      .select()
      .from(supplierEvaluations)
      .where(
        and(
          eq(supplierEvaluations.partnerId, partnerId),
          eq(supplierEvaluations.scope, EVAL_SCOPE_INITIAL),
          eq(supplierEvaluations.status, 'active'),
        )!,
      )
      .orderBy(desc(supplierEvaluations.evaluatedAt), desc(supplierEvaluations.createdAt))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      partner_id: String(row.partnerId),
      weighted_score: this.roundScore(Number(row.weightedScore)),
      category: row.category as SupplierEvaluationCategory,
      evaluated_at: row.evaluatedAt ? String(row.evaluatedAt) : '',
      next_reevaluation_date: row.nextReevaluationDate ? String(row.nextReevaluationDate) : null,
      comment: row.comment ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }

  async createInitial(dto: CreateInitialSupplierEvaluationDto, createdByUserId?: string) {
    this.validateEvaluatedAt(dto.evaluated_at);
    // Для initial не нужен project_id и нет привязки к договорам/проектам
    const [p] = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(and(eq(partners.id, dto.partner_id), eq(partners.isDeleted, false)))
      .limit(1);
    if (!p) {
      throw new BadRequestException('Контрагент не найден или удалён');
    }

    const criteriaRows = await this.db.db
      .select()
      .from(refSupplierEvaluationCriteria)
      .where(eq(refSupplierEvaluationCriteria.isActive, true));

    if (criteriaRows.length === 0) {
      throw new BadRequestException('В справочнике нет активных критериев оценки');
    }

    const activeCriterionIds = new Set(criteriaRows.map((c) => String(c.id)));
    const weightById = new Map(criteriaRows.map((c) => [String(c.id), Number(c.weight)]));

    const seen = new Set<string>();
    for (const s of dto.scores) {
      if (seen.has(s.criterion_id)) {
        throw new BadRequestException(`Критерий ${s.criterion_id} указан более одного раза`);
      }
      seen.add(s.criterion_id);
      if (!activeCriterionIds.has(s.criterion_id)) {
        throw new BadRequestException(`Неизвестный или неактивный критерий: ${s.criterion_id}`);
      }
    }

    if (seen.size === 0) {
      throw new BadRequestException('Нужен минимум один критерий для первичной оценки');
    }

    const sumWeights = dto.scores.reduce((acc, s) => acc + (weightById.get(s.criterion_id) ?? 0), 0);
    if (!Number.isFinite(sumWeights) || sumWeights <= 0) {
      throw new BadRequestException('Сумма весов выбранных критериев должна быть больше 0');
    }

    let weighted = 0;
    for (const s of dto.scores) {
      const w = weightById.get(s.criterion_id) ?? 0;
      weighted += s.score * (w / sumWeights);
    }
    weighted = Math.round(weighted * 100) / 100;

    const category = categoryFromWeightedScore(weighted);
    const nextReevaluation = nextReevaluationDateForCategory(dto.evaluated_at, category);

    const createdBy = createdByUserId ?? null;

    const inserted = await this.db.db.transaction(async (tx) => {
      await tx
        .update(supplierEvaluations)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(
          and(
            eq(supplierEvaluations.partnerId, dto.partner_id),
            eq(supplierEvaluations.scope, EVAL_SCOPE_INITIAL),
            eq(supplierEvaluations.status, 'active'),
          )!,
        );

      const [row] = await tx
        .insert(supplierEvaluations)
        .values({
          partnerId: dto.partner_id,
          projectId: null,
          scope: EVAL_SCOPE_INITIAL,
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
      if (!row) throw new Error('INSERT supplier_evaluations (initial) не вернул строку');

      await tx.insert(supplierEvaluationCriterionScores).values(
        dto.scores.map((s) => ({
          evaluationId: row.id,
          criterionId: s.criterion_id,
          score: String(s.score),
        })),
      );

      return row;
    });

    await this.partnersService.refreshPartnerDerivedStatus(dto.partner_id);
    return {
      id: String(inserted.id),
      partner_id: String(inserted.partnerId),
      weighted_score: this.roundScore(Number(inserted.weightedScore)),
      category: inserted.category as SupplierEvaluationCategory,
      evaluated_at: inserted.evaluatedAt ? String(inserted.evaluatedAt) : '',
      next_reevaluation_date: inserted.nextReevaluationDate ? String(inserted.nextReevaluationDate) : null,
      comment: inserted.comment ?? '',
      created_at: inserted.createdAt ? inserted.createdAt.toISOString() : '',
      updated_at: inserted.updatedAt ? inserted.updatedAt.toISOString() : null,
    };
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
    await this.partnersService.refreshPartnerDerivedStatus(String(row.partnerId));
    return updated[0] ? this.blockToResponse(updated[0]) : null;
  }

  private buildListWhere(filters: SupplierEvaluationQueryFilters): SQL | undefined {
    const parts: SQL[] = [];
    // Список/фильтры в UI сейчас про проектные оценки — не смешиваем с первичными.
    parts.push(eq(supplierEvaluations.scope, EVAL_SCOPE_PROJECT));
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
