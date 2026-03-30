import type { SQL } from 'drizzle-orm';
import { and, asc, count, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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

export type PartnerListTabScope = 'all' | 'ready' | 'in_progress' | 'key_supplier';

export interface PartnerQueryFilters {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: PartnerListTabScope;
  deletedScope?: DeletedScope;
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

  constructor(private readonly db: DatabaseService) {}

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

  private async countPartners(where: SQL): Promise<number> {
    const rows = await this.db.db.select({ value: count() }).from(partners).where(where);
    return Number(rows[0]?.value ?? 0);
  }

  private async buildPartnerBaseParts(filters?: PartnerQueryFilters): Promise<SQL[] | null> {
    const parts: SQL[] = [];
    const raw = filters?.search?.trim();
    if (raw) {
      const safe = raw.replace(/[%_]/g, '');
      if (safe.length > 0) {
        const term = `%${safe}%`;
        parts.push(or(ilike(partners.name, term), ilike(partners.inn, term))!);
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
    return parts;
  }

  async findAll(
    preview?: boolean,
    pagination?: PaginationParams,
    filters?: PartnerQueryFilters,
  ): Promise<PartnersListPayload> {
    this.logger.debug(`Получение партнёров (preview=${preview})`);

    if (preview) {
      const rows = await this.db.db
        .select({ id: partners.id, name: partners.name })
        .from(partners)
        .where(eq(partners.isDeleted, false))
        .orderBy(asc(partners.name));
      const data = rows.map((row) => ({ id: String(row.id), name: row.name ?? '' }));
      const n = data.length;
      return {
        data,
        total: n,
        tab_counts: { all: n, ready: 0, in_progress: 0, key_supplier: 0 },
        deletion_tab_counts: { active: n, deleted: 0, all: n },
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
          .orderBy(asc(partners.name))
          .limit(limit)
          .offset(offset),
      ]);

    const total = listTotal;

    const ids = rows.map((row) => row.id).filter(Boolean) as string[];

    await Promise.all(ids.map((pid) => this.applyDerivedPartnerStatus(pid, { ignoreArchiveLock: false })));
    let rowsForList = rows;
    if (ids.length > 0) {
      const freshList = await this.db.db.select().from(partners).where(inArray(partners.id, ids));
      const byId = new Map(freshList.map((r) => [String(r.id), r]));
      rowsForList = rows.map((r) => byId.get(String(r.id)) ?? r);
    }

    const [typeRows, compRows] = ids.length
      ? await Promise.all([
          this.db.db
            .select({ partnerId: relPartnersTypes.partnerId, typeId: relPartnersTypes.typeId })
            .from(relPartnersTypes)
            .where(inArray(relPartnersTypes.partnerId, ids)),
          this.db.db
            .select({ partnerId: relPartnersCompetencies.partnerId, competenceId: relPartnersCompetencies.competenceId })
            .from(relPartnersCompetencies)
            .where(inArray(relPartnersCompetencies.partnerId, ids)),
        ])
      : [[], []];

    const typeMap = new Map<string, string[]>();
    for (const t of typeRows) {
      if (t.partnerId && t.typeId) {
        const arr = typeMap.get(String(t.partnerId)) ?? [];
        arr.push(String(t.typeId));
        typeMap.set(String(t.partnerId), arr);
      }
    }

    const compMap = new Map<string, string[]>();
    for (const c of compRows) {
      if (c.partnerId && c.competenceId) {
        const arr = compMap.get(String(c.partnerId)) ?? [];
        arr.push(String(c.competenceId));
        compMap.set(String(c.partnerId), arr);
      }
    }

    const partnerIds = rowsForList.map((row) => String(row.id));
    const categoryIds = [...new Set(rowsForList.map((row) => row.categoryId).filter(Boolean))] as string[];

    const [categoryNameById, blockedPartnerIds] = await Promise.all([
      this.loadCategoryNamesByIds(categoryIds),
      this.loadBlockedPartnerIds(partnerIds),
    ]);

    const data = rowsForList.map((row) => {
      const pid = String(row.id);
      const catId = row.categoryId ? String(row.categoryId) : '';
      const catName = catId ? categoryNameById.get(catId) ?? null : null;
      const hasBlock = blockedPartnerIds.has(pid);
      const extras = this.partnerApprovalExtras(row, catName, hasBlock);
      return {
        ...this.toResponse(row, extras),
        type_ids: typeMap.get(pid) ?? [],
        competence_ids: compMap.get(pid) ?? [],
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
    this.logger.debug(`Получение партнёра по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const pid = String(row.id);
    const statusNameBefore = await this.getPartnerStatusName(row.statusId ? String(row.statusId) : null);
    if ((statusNameBefore ?? '').trim() !== 'Архив') {
      await this.applyDerivedPartnerStatus(pid, { ignoreArchiveLock: false });
    }
    const rowsFresh = await this.db.db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    const rowFresh = rowsFresh[0] ?? row;

    const catId = rowFresh.categoryId ? String(rowFresh.categoryId) : '';
    const [typeRows, compRows, categoryNameById, blockedPartnerIds] = await Promise.all([
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
    ]);
    const catName = catId ? categoryNameById.get(catId) ?? null : null;
    const hasBlock = blockedPartnerIds.has(pid);
    const extras = this.partnerApprovalExtras(rowFresh, catName, hasBlock);
    return {
      ...this.toResponse(rowFresh, extras),
      type_ids: typeRows.map((typeRow) => String(typeRow.typeId)).filter(Boolean),
      competence_ids: compRows.map((compRow) => String(compRow.competenceId)).filter(Boolean),
    };
  }

  async create(data: Record<string, unknown>, userId?: string) {
    this.logger.debug('Создание партнёра');
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
    if (manualArchive !== true) {
      await this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: true });
    }
    return this.findOne(partnerId);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    this.logger.debug(`Обновление партнёра id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
    const currentStatusName = await this.getPartnerStatusName(
      current.status_id ? String(current.status_id) : null,
    );
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
      const { archiveId } = await this.resolvePartnerOperationalStatusIds();
      await this.db.db
        .update(partners)
        .set({
          statusId: archiveId,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(partners.id, id));
    } else if (manualArchive === false) {
      await this.applyDerivedPartnerStatus(id, { ignoreArchiveLock: true });
    } else if ((currentStatusName ?? '').trim() !== 'Архив') {
      await this.applyDerivedPartnerStatus(id, { ignoreArchiveLock: false });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Мягкое удаление партнёра id: ${id}`);
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
    this.logger.debug(`Восстановление партнёра id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .update(partners)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(partners.id, id));
    return this.findOne(id);
  }

  /**
   * Активный / Потенциальный / Заблокирован пересчитываются по договорам и оценкам.
   * Статус «Архив» не меняется при этом вызове (см. update + manual_archive).
   */
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
    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const toBool = (v: unknown): boolean | undefined =>
      v === true || v === 'true' ? true : v === false || v === 'false' ? false : undefined;
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
      ...(toBool(data.is_key_supplier) !== undefined && { isKeySupplier: toBool(data.is_key_supplier) }),
      ...(toBool(data.is_targeted) !== undefined && { isTargeted: toBool(data.is_targeted) }),
      ...(toBool(data.legal_check_passed) !== undefined && { legalCheckPassed: toBool(data.legal_check_passed) }),
      ...(toBool(data.questionnaire_filled) !== undefined && { questionnaireFilled: toBool(data.questionnaire_filled) }),
      ...(toBool(data.initial_assessment_done) !== undefined && { initialAssessmentDone: toBool(data.initial_assessment_done) }),
      ...(data.rating !== undefined && { rating: data.rating != null ? String(data.rating) : null }),
      ...(data.next_audit_date !== undefined && { nextAuditDate: data.next_audit_date != null ? String(data.next_audit_date) : null }),
    };
  }

  private parseManualArchiveFlag(data: Record<string, unknown>): boolean | undefined {
    if (!('manual_archive' in data) || data.manual_archive === undefined) return undefined;
    const v = data.manual_archive;
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return undefined;
  }

  private async getPartnerStatusName(statusId: string | null | undefined): Promise<string | null> {
    if (!statusId) return null;
    const rows = await this.db.db
      .select({ name: refPartnerStatuses.name })
      .from(refPartnerStatuses)
      .where(eq(refPartnerStatuses.id, statusId))
      .limit(1);
    return rows[0]?.name?.trim() ?? null;
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
    for (const r of rows) {
      const k = (r.name ?? '').trim().toLowerCase();
      if (k) byLower.set(k, String(r.id));
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

  /**
   * Как вкладка «Действующие»: не мягко удалён + is_active (подписан → на бэке выставляется is_active).
   * Одного такого договора достаточно для «Активный» (если не «Заблокирован» по средней оценке).
   */
  private async partnerHasAtLeastOneEffectiveContract(partnerId: string): Promise<boolean> {
    const rows = await this.db.db
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
    return rows.length > 0;
  }

  private isoDateOnlyEval(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
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
    for (const r of evalRows) {
      const pid = String(r.projectId);
      const prev = byProject.get(pid);
      const evAt = this.isoDateOnlyEval(r.evaluatedAt);
      const prevAt = prev ? this.isoDateOnlyEval(prev.evaluatedAt) : '';
      if (!prev || evAt > prevAt) {
        byProject.set(pid, r);
      }
    }
    const perProject = [...byProject.values()];
    if (perProject.length === 0) return null;
    const sum = perProject.reduce((acc, r) => acc + Number(r.weightedScore), 0);
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
    const rows = await this.db.db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    const row = rows[0];
    if (!row) return;

    const ids = await this.resolvePartnerOperationalStatusIds();
    const statusName = await this.getPartnerStatusName(row.statusId ? String(row.statusId) : null);
    if (statusName === 'Архив' && !opts.ignoreArchiveLock) {
      return;
    }

    const nextId = await this.computeAutoStatusIdForPartnerRow(partnerId, ids);
    const curId = row.statusId ? String(row.statusId) : null;
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
  ): { isApproved: boolean; hasActiveEvaluationBlock: boolean } {
    const isApproved = computePartnerIsApproved({
      kind: inferPartnerCategoryKind(categoryName),
      legalCheckPassed: !!(row.legalCheckPassed ?? false),
      questionnaireFilled: !!(row.questionnaireFilled ?? false),
      initialAssessmentDone: !!(row.initialAssessmentDone ?? false),
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
    for (const cr of catRows) {
      map.set(String(cr.id), cr.name ?? '');
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

  private toResponse(
    r: (typeof partners.$inferSelect),
    extras: { isApproved: boolean; hasActiveEvaluationBlock: boolean },
  ) {
    return {
      id: String(r.id),
      name: r.name ?? '',
      short_name: r.shortName ?? '',
      inn: r.inn ?? '',
      kpp: r.kpp ?? '',
      ogrn: r.ogrn ?? '',
      legal_address: r.legalAddress ?? '',
      actual_address: r.actualAddress ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
      website: r.website ?? '',
      status_id: r.statusId ? String(r.statusId) : '',
      category_id: r.categoryId ? String(r.categoryId) : '',
      comment: r.comment ?? '',
      partner_economic_category_id: r.partnerEconomicCategoryId ? String(r.partnerEconomicCategoryId) : '',
      is_key_supplier: r.isKeySupplier ?? false,
      is_targeted: r.isTargeted ?? false,
      legal_check_passed: r.legalCheckPassed ?? false,
      questionnaire_filled: r.questionnaireFilled ?? false,
      initial_assessment_done: r.initialAssessmentDone ?? false,
      is_approved: extras.isApproved,
      has_active_evaluation_block: extras.hasActiveEvaluationBlock,
      rating: r.rating ? Number(r.rating) : null,
      next_audit_date: r.nextAuditDate ?? null,
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
      is_deleted: r.isDeleted ?? false,
    };
  }
}
