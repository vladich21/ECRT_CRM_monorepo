import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  relPartnersTypes,
  relPartnersCompetencies,
  contracts,
} from '../../../database/schema';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение партнёров (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: partners.id, name: partners.name })
        .from(partners)
        .orderBy(asc(partners.name));
      return rows.map((r) => ({ id: String(r.id), name: r.name ?? '' }));
    }
    const rows = await this.db.db
      .select()
      .from(partners)
      .orderBy(asc(partners.name));
    const ids = rows.map((r) => r.id).filter(Boolean) as string[];
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
    return rows.map((r) => ({
      ...this.toResponse(r),
      type_ids: typeMap.get(String(r.id)) ?? [],
      competence_ids: compMap.get(String(r.id)) ?? [],
    }));
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
      type_ids: typeRows.map((t) => String(t.typeId)).filter(Boolean),
      competence_ids: compRows.map((c) => String(c.competenceId)).filter(Boolean),
    };
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание партнёра');
    this.validateInnKppRequired(data);
    const insertData = this.mapToDb(data);
    await this.checkInnKppUnique(insertData.inn, insertData.kpp);
    const [row] = await this.db.db.insert(partners).values(insertData).returning();
    if (!row) return null;
    const partnerId = String(row.id);
    await this.syncRelTables(partnerId, data);
    return this.findOne(partnerId);
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление партнёра id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
    const merged = { ...current, ...data };
    this.validateInnKppRequired(merged);
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
      comment: 'comment',
      partner_economic_category_id: 'partnerEconomicCategoryId',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
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
      comment: data.comment != null ? String(data.comment) : null,
      partnerEconomicCategoryId: toUuid(data.partner_economic_category_id),
    };
  }

  private toResponse(r: (typeof partners.$inferSelect)) {
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
      comment: r.comment ?? '',
      partner_economic_category_id: r.partnerEconomicCategoryId ? String(r.partnerEconomicCategoryId) : '',
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
    };
  }
}
