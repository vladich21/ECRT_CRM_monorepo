import { asc, count, eq } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { contracts, patents } from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';

/** TTL кэша списка договоров для справочников */
const CONTRACTS_LIST_CACHE_TTL_MS = 10 * 60 * 1000; // 10 мин

// Мок договора для демо (закомментирован). Раскомментировать при необходимости.
// const MOCK_CONTRACT_ID = '9a75a367-5856-4aa3-a93f-224485f5372b';
// const getMockContract = (): any => ({ ... });

interface CachedList {
  data: unknown[];
  total: number;
  expiresAt: number;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  /** In-memory кэш первой страницы списка (без partner_id) для использования в справочниках */
  private listCache: Map<string, CachedList> = new Map();

  constructor(private readonly db: DatabaseService) {}

  private cacheKey(preview: boolean, limit: number): string {
    return `contracts:preview:${preview}:limit:${limit}`;
  }

  private cacheKeyAll(preview: boolean): string {
    return `contracts:preview:${preview}:all`;
  }

  private invalidateListCache(): void {
    this.listCache.clear();
  }

  private getValidCache(key: string): CachedList | null {
    const cached = this.listCache.get(key);
    if (!cached || cached.expiresAt <= Date.now()) return null;
    return cached;
  }

  private setListCache(key: string, result: { data: unknown[]; total: number }): void {
    this.listCache.set(key, {
      ...result,
      expiresAt: Date.now() + CONTRACTS_LIST_CACHE_TTL_MS,
    });
  }

  private async getContractsTotal(partnerFilter?: any): Promise<number> {
    let countQuery = this.db.db.select({ value: count() }).from(contracts);
    if (partnerFilter) countQuery = countQuery.where(partnerFilter) as typeof countQuery;
    const result = await countQuery;
    return Number(result[0]?.value ?? 0);
  }

  private async getContractsRows(
    preview: boolean,
    partnerFilter?: any,
    pagination?: PaginationParams,
  ) {
    if (preview) {
      let query: any = this.db.db
        .select({ id: contracts.id, name: contracts.name, number: contracts.number })
        .from(contracts)
        .orderBy(asc(contracts.number));
      if (partnerFilter) query = query.where(partnerFilter);
      if (pagination) query = query.limit(pagination.limit).offset(pagination.offset);
      return query;
    }

    let query: any = this.db.db.select().from(contracts).orderBy(asc(contracts.number));
    if (partnerFilter) query = query.where(partnerFilter);
    if (pagination) query = query.limit(pagination.limit).offset(pagination.offset);
    return query;
  }

  private mapContractsRows(rows: any[], preview: boolean): unknown[] {
    if (preview) {
      return rows.map((row) => ({ id: String(row.id), name: row.name ?? row.number ?? '' }));
    }
    return rows.map((row) => this.toResponse(row));
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание договора');
    const map: Record<string, string> = {
      number: 'number',
      cipher: 'cipher',
      name: 'name',
      description: 'description',
      partner_id: 'partnerId',
      project_id: 'projectId',
      responsible_id: 'responsibleId',
      category_id: 'categoryId',
      contract_type_id: 'contractTypeId',
      amount_excl_vat: 'amountExclVat',
      vat_rate: 'vatRate',
      amount_vat: 'amountVat',
      amount_incl_vat: 'amountInclVat',
      start_date: 'startDate',
      end_date: 'endDate',
      date_signed: 'dateSigned',
      state_id: 'stateId',
      is_active: 'isActive',
    };
    const insertData: Record<string, unknown> = {};
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) insertData[camel] = data[snake];
    }
    const [row] = await this.db.db.insert(contracts).values(insertData as any).returning();
    this.invalidateListCache();
    return row ? this.toResponse(row) : null;
  }

  async findAll(
    preview?: boolean,
    partnerId?: string,
    pagination?: PaginationParams,
    options?: { forReference?: boolean },
  ): Promise<{ data: unknown[]; total: number }> {
    const forReference = options?.forReference && !partnerId;
    this.logger.debug(
      `Получение договоров (preview=${preview}, partner_id=${partnerId}, forReference=${forReference})`,
    );

    if (forReference) {
      const key = this.cacheKeyAll(!!preview);
      const cached = this.getValidCache(key);
      if (cached) return { data: cached.data, total: cached.total };
    }

    const partnerFilter = partnerId ? eq(contracts.partnerId, partnerId) : undefined;
    const { limit = 50, offset = 0 } = pagination ?? { limit: 50, offset: 0 };

    if (!forReference && !partnerId && offset === 0) {
      const key = this.cacheKey(!!preview, limit);
      const cached = this.getValidCache(key);
      if (cached) return { data: cached.data, total: cached.total };
    }

    if (forReference) {
      const rows = await this.getContractsRows(!!preview);
      const result = {
        data: this.mapContractsRows(rows, !!preview),
        total: rows.length,
      };
      this.setListCache(this.cacheKeyAll(!!preview), result);
      return result;
    }

    const [total, rows] = await Promise.all([
      this.getContractsTotal(partnerFilter),
      this.getContractsRows(!!preview, partnerFilter, { limit, offset }),
    ]);
    const result = { data: this.mapContractsRows(rows, !!preview), total };
    if (!partnerId && offset === 0) {
      this.setListCache(this.cacheKey(!!preview, limit), result);
    }
    return result;
  }

  async findOne(id: string) {
    this.logger.debug(`Получение договора по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление договора id: ${id}`);
    const map: Record<string, string> = {
      number: 'number',
      cipher: 'cipher',
      name: 'name',
      description: 'description',
      partner_id: 'partnerId',
      project_id: 'projectId',
      responsible_id: 'responsibleId',
      category_id: 'categoryId',
      contract_type_id: 'contractTypeId',
      amount_excl_vat: 'amountExclVat',
      vat_rate: 'vatRate',
      amount_vat: 'amountVat',
      amount_incl_vat: 'amountInclVat',
      start_date: 'startDate',
      end_date: 'endDate',
      date_signed: 'dateSigned',
      state_id: 'stateId',
      is_active: 'isActive',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) updateObj[camel] = data[snake];
    }
    await this.db.db.update(contracts).set(updateObj).where(eq(contracts.id, id));
    this.invalidateListCache();
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление договора id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    const patentRefs = await this.db.db
      .select({ id: patents.id })
      .from(patents)
      .where(eq(patents.contractId, id))
      .limit(1);
    if (patentRefs.length > 0) {
      throw new ConflictException(
        'Невозможно удалить договор: к нему привязаны патенты.',
      );
    }
    await this.db.db.delete(contracts).where(eq(contracts.id, id));
    this.invalidateListCache();
    return row;
  }

  private toResponse(row: (typeof contracts.$inferSelect)) {
    return {
      id: String(row.id),
      number: row.number ?? '',
      cipher: row.cipher ?? '',
      name: row.name ?? '',
      description: row.description ?? '',
      partner_id: String(row.partnerId),
      project_id: row.projectId ? String(row.projectId) : '',
      responsible_id: row.responsibleId ? String(row.responsibleId) : '',
      category_id: String(row.categoryId),
      contract_type_id: row.contractTypeId ? String(row.contractTypeId) : '',
      amount_excl_vat: parseFloat(String(row.amountExclVat ?? 0)),
      vat_rate: parseFloat(String(row.vatRate ?? 0)),
      amount_vat: parseFloat(String(row.amountVat ?? 0)),
      amount_incl_vat: parseFloat(String(row.amountInclVat ?? 0)),
      start_date: row.startDate ? String(row.startDate) : '',
      end_date: row.endDate ? String(row.endDate) : '',
      date_signed: row.dateSigned ? String(row.dateSigned) : '',
      state_id: String(row.stateId),
      is_active: row.isActive ?? true,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}