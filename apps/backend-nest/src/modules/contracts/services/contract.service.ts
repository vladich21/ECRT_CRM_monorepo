import type { SQL } from 'drizzle-orm';
import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { contracts, patents, refContractStates } from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';

export type ContractListTab = 'all' | 'active' | 'draft' | 'inactive';

export interface ContractQueryFilters {
  search?: string;
  listTab?: ContractListTab;
  categoryId?: string;
  stateId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export interface ContractTabCounts {
  all: number;
  active: number;
  draft: number;
  inactive: number;
}

export type ContractsListResult =
  | { data: unknown[]; total: number; tab_counts: ContractTabCounts }
  | { data: unknown[]; total: number };

/** TTL кэша списка договоров для справочников */
const CONTRACTS_LIST_CACHE_TTL_MS = 10 * 60 * 1000; // 10 мин

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

  private mergeWhereParts(parts: SQL[]): SQL {
    if (parts.length === 0) return sql`true`;
    if (parts.length === 1) return parts[0];
    return and(...parts)!;
  }

  private async countContractsWhere(where: SQL): Promise<number> {
    const result = await this.db.db.select({ value: count() }).from(contracts).where(where);
    return Number(result[0]?.value ?? 0);
  }

  private async getDraftStateIds(): Promise<string[]> {
    const rows = await this.db.db
      .select({ id: refContractStates.id })
      .from(refContractStates)
      .where(
        or(
          sql`lower(${refContractStates.code}) = 'draft'`,
          ilike(refContractStates.name, '%чернов%'),
        ),
      );
    return rows.map((r) => r.id).filter(Boolean) as string[];
  }

  private contractListTabCondition(tab: ContractListTab, draftIds: string[]): SQL | undefined {
    switch (tab) {
      case 'all':
        return undefined;
      case 'active':
        return eq(contracts.isActive, true);
      case 'inactive':
        return eq(contracts.isActive, false);
      case 'draft':
        return draftIds.length ? inArray(contracts.stateId, draftIds) : sql`false`;
    }
  }

  /** null — невозможное условие (поиск только из спецсимволов) → пустой список */
  private async buildContractFilterParts(
    filters?: ContractQueryFilters,
  ): Promise<SQL[] | null> {
    const parts: SQL[] = [];
    if (!filters) return parts;

    if (filters.categoryId) {
      parts.push(eq(contracts.categoryId, filters.categoryId));
    }
    if (filters.stateId) {
      parts.push(eq(contracts.stateId, filters.stateId));
    }
    if (filters.dateFrom && filters.dateTo) {
      parts.push(
        and(
          lte(contracts.startDate, filters.dateTo),
          gte(sql`COALESCE(${contracts.endDate}, ${contracts.startDate})`, filters.dateFrom),
        )!,
      );
    }
    if (filters.amountMin != null && !Number.isNaN(filters.amountMin)) {
      parts.push(gte(contracts.amountInclVat, String(filters.amountMin)));
    }
    if (filters.amountMax != null && !Number.isNaN(filters.amountMax)) {
      parts.push(lte(contracts.amountInclVat, String(filters.amountMax)));
    }

    const raw = filters.search?.trim();
    if (raw) {
      const safe = raw.replace(/[%_\\]/g, '');
      if (!safe) return null;
      const term = `%${safe}%`;
      parts.push(
        or(
          ilike(contracts.number, term),
          ilike(contracts.cipher, term),
          ilike(contracts.name, term),
          sql`exists (select 1 from partners p where p.id = ${contracts.partnerId} and p.name ilike ${term})`,
        )!,
      );
    }

    return parts;
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
    options?: { forReference?: boolean; filters?: ContractQueryFilters },
  ): Promise<ContractsListResult> {
    const forReference = options?.forReference && !partnerId;
    const filters = options?.filters;
    this.logger.debug(
      `Получение договоров (preview=${preview}, partner_id=${partnerId}, forReference=${forReference})`,
    );

    if (forReference) {
      const key = this.cacheKeyAll(!!preview);
      const cached = this.getValidCache(key);
      if (cached) return { data: cached.data, total: cached.total };
      const rows = await this.getContractsRows(!!preview);
      const result = {
        data: this.mapContractsRows(rows, !!preview),
        total: rows.length,
      };
      this.setListCache(this.cacheKeyAll(!!preview), result);
      return result;
    }

    const { limit = 50, offset = 0 } = pagination ?? { limit: 50, offset: 0 };
    const partnerFilter = partnerId ? eq(contracts.partnerId, partnerId) : undefined;

    if (preview) {
      const [total, rows] = await Promise.all([
        this.getContractsTotal(partnerFilter),
        this.getContractsRows(true, partnerFilter, { limit, offset }),
      ]);
      return { data: this.mapContractsRows(rows, true), total };
    }

    const filterParts = await this.buildContractFilterParts(filters);
    if (filterParts === null) {
      return {
        data: [],
        total: 0,
        tab_counts: { all: 0, active: 0, draft: 0, inactive: 0 },
      };
    }

    const baseParts: SQL[] = [];
    if (partnerFilter) baseParts.push(partnerFilter);
    baseParts.push(...filterParts);

    const draftIds = await this.getDraftStateIds();

    const countForTab = async (tab: ContractListTab): Promise<number> => {
      const tabSql = this.contractListTabCondition(tab, draftIds);
      const parts = tabSql ? [...baseParts, tabSql] : [...baseParts];
      return this.countContractsWhere(this.mergeWhereParts(parts));
    };

    const listTab: ContractListTab = filters?.listTab ?? 'all';
    const listTabSql = this.contractListTabCondition(listTab, draftIds);
    const listParts = listTabSql ? [...baseParts, listTabSql] : [...baseParts];
    const listWhere = this.mergeWhereParts(listParts);

    const [tabAll, tabActive, tabDraft, tabInactive, rows] = await Promise.all([
      countForTab('all'),
      countForTab('active'),
      countForTab('draft'),
      countForTab('inactive'),
      this.db.db
        .select()
        .from(contracts)
        .where(listWhere)
        .orderBy(asc(contracts.number))
        .limit(limit)
        .offset(offset),
    ]);

    const total =
      listTab === 'active'
        ? tabActive
        : listTab === 'inactive'
          ? tabInactive
          : listTab === 'draft'
            ? tabDraft
            : tabAll;

    return {
      data: this.mapContractsRows(rows, false),
      total,
      tab_counts: {
        all: tabAll,
        active: tabActive,
        draft: tabDraft,
        inactive: tabInactive,
      },
    };
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