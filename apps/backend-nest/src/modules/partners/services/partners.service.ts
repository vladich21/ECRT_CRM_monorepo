import type { SQL } from 'drizzle-orm';
import { and, asc, count, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  relPartnersTypes,
  relPartnersCompetencies,
  partnerContacts,
  contracts,
  refPartnerStatuses,
  refPartnerEconomicCategories,
  refPartnerTypes,
  refPartnerCompetencies,
  refPartnerCategories,
} from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';

export type PartnerListTabScope = 'all' | 'ready' | 'in_progress' | 'key_supplier';

export interface PartnerQueryFilters {
  search?: string;
  typeIds?: string[];
  statusIds?: string[];
  competenceIds?: string[];
  readiness?: PartnerListTabScope;
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

  private mergeWhere(baseParts: SQL[], extra?: SQL): SQL | undefined {
    const parts = extra ? [...baseParts, extra] : [...baseParts];
    return parts.length ? and(...parts) : undefined;
  }

  private async countPartners(where: SQL | undefined): Promise<number> {
    const base = this.db.db.select({ value: count() }).from(partners);
    const rows = where != null ? await base.where(where) : await base;
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
        .orderBy(asc(partners.name));
      const data = rows.map((row) => ({ id: String(row.id), name: row.name ?? '' }));
      const n = data.length;
      return {
        data,
        total: n,
        tab_counts: { all: n, ready: 0, in_progress: 0, key_supplier: 0 },
      };
    }

    const baseParts = await this.buildPartnerBaseParts(filters);
    if (baseParts === null) {
      return {
        data: [],
        total: 0,
        tab_counts: { all: 0, ready: 0, in_progress: 0, key_supplier: 0 },
      };
    }

    const tab = filters?.readiness ?? 'all';
    const whereAll = this.mergeWhere(baseParts, this.listTabSql('all'));
    const whereReady = this.mergeWhere(baseParts, this.listTabSql('ready'));
    const whereInProgress = this.mergeWhere(baseParts, this.listTabSql('in_progress'));
    const whereKeySupplier = this.mergeWhere(baseParts, this.listTabSql('key_supplier'));
    const listWhere = this.mergeWhere(baseParts, this.listTabSql(tab));

    const { limit = 20, offset = 0 } = pagination ?? {};

    const [tabAll, tabReady, tabInProgress, tabKeySupplier, rows] = await Promise.all([
      this.countPartners(whereAll),
      this.countPartners(whereReady),
      this.countPartners(whereInProgress),
      this.countPartners(whereKeySupplier),
      this.db.db
        .select()
        .from(partners)
        .where(listWhere ?? sql`true`)
        .orderBy(asc(partners.name))
        .limit(limit)
        .offset(offset),
    ]);

    const total =
      tab === 'ready'
        ? tabReady
        : tab === 'in_progress'
          ? tabInProgress
          : tab === 'key_supplier'
            ? tabKeySupplier
            : tabAll;

    const ids = rows.map((row) => row.id).filter(Boolean) as string[];

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

    const data = rows.map((row) => ({
      ...this.toResponse(row),
      type_ids: typeMap.get(String(row.id)) ?? [],
      competence_ids: compMap.get(String(row.id)) ?? [],
    }));

    return {
      data,
      total,
      tab_counts: {
        all: tabAll,
        ready: tabReady,
        in_progress: tabInProgress,
        key_supplier: tabKeySupplier,
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
    const [typeRows, compRows] = await Promise.all([
      this.db.db
        .select({ typeId: relPartnersTypes.typeId })
        .from(relPartnersTypes)
        .where(eq(relPartnersTypes.partnerId, id)),
      this.db.db
        .select({ competenceId: relPartnersCompetencies.competenceId })
        .from(relPartnersCompetencies)
        .where(eq(relPartnersCompetencies.partnerId, id)),
    ]);
    return {
      ...this.toResponse(row),
      type_ids: typeRows.map((typeRow) => String(typeRow.typeId)).filter(Boolean),
      competence_ids: compRows.map((compRow) => String(compRow.competenceId)).filter(Boolean),
    };
  }

  async create(data: Record<string, unknown>, userId?: string) {
    this.logger.debug('Создание партнёра');
    this.validateInnKppRequired(data);
    await this.validateReferences(data);
    const insertData = {
      ...this.mapToDb(data),
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    };
    await this.checkInnKppUnique(insertData.inn, insertData.kpp);
    const [row] = await this.db.db.insert(partners).values(insertData).returning();
    if (!row) return null;
    const partnerId = String(row.id);
    await this.syncRelTables(partnerId, data);
    return this.findOne(partnerId);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    this.logger.debug(`Обновление партнёра id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
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
      status_id: 'statusId',
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
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление партнёра id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    const contractRefs = await this.db.db
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.partnerId, id))
      .limit(1);
    if (contractRefs.length > 0) {
      throw new ConflictException(
        'Невозможно удалить партнёра: к нему привязаны договоры.',
      );
    }
    await this.db.db.delete(partnerContacts).where(eq(partnerContacts.partnerId, id));
    await this.db.db.delete(relPartnersTypes).where(eq(relPartnersTypes.partnerId, id));
    await this.db.db.delete(relPartnersCompetencies).where(eq(relPartnersCompetencies.partnerId, id));
    await this.db.db.delete(partners).where(eq(partners.id, id));
    return row;
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
    if (data.status_id) {
      const rows = await this.db.db
        .select({ id: refPartnerStatuses.id })
        .from(refPartnerStatuses)
        .where(eq(refPartnerStatuses.id, String(data.status_id)))
        .limit(1);
      if (rows.length === 0) {
        throw new ConflictException('Указанный статус контрагента не найден');
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
      .where(and(...conditions))
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
      statusId: toUuid(data.status_id),
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

  private toResponse(r: (typeof partners.$inferSelect)) {
    const isApproved = !!(r.legalCheckPassed && r.questionnaireFilled && r.initialAssessmentDone);
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
      is_approved: isApproved,
      rating: r.rating ? Number(r.rating) : null,
      next_audit_date: r.nextAuditDate ?? null,
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
    };
  }
}
