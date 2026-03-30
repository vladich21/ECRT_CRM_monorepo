import type { SQL } from 'drizzle-orm';
import { and, asc, count, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { PartnersService } from '../../partners/services/partners.service';
import { contracts, patents, refContractStates } from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';
import type { DeletedScope, DeletionTabCounts } from '../../../common/deleted-scope';
import { sqlPartsForDeletedScope } from '../../../common/deleted-scope';

export type ContractListTab = 'all' | 'active' | 'draft' | 'inactive';

export interface ContractQueryFilters {
  search?: string;
  listTab?: ContractListTab;
  /** Мягкое удаление: по умолчанию только не удалённые. */
  deletedScope?: DeletedScope;
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
  | {
      data: unknown[];
      total: number;
      tab_counts: ContractTabCounts;
      deletion_tab_counts: DeletionTabCounts;
    }
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

  constructor(
    private readonly db: DatabaseService,
    private readonly partnersService: PartnersService,
  ) {}

  /**
   * После любой записи договора: смена состояния / is_active / партнёра / мягкое удаление —
   * пересчитать автоматический статус затронутых контрагентов (см. PartnersService).
   */
  private async refreshPartnerDerivedStatusForPartnerIds(
    rawIds: Array<string | null | undefined>,
  ): Promise<void> {
    const ids = [...new Set(rawIds.filter((id): id is string => Boolean(id && String(id).trim())))];
    await Promise.all(ids.map((pid) => this.partnersService.refreshPartnerDerivedStatus(pid)));
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

  private async getContractsTotal(partnerFilter?: SQL): Promise<number> {
    const notDeleted = eq(contracts.isDeleted, false);
    const where = partnerFilter ? and(partnerFilter, notDeleted)! : notDeleted;
    const result = await this.db.db.select({ value: count() }).from(contracts).where(where);
    return Number(result[0]?.value ?? 0);
  }

  private contractsListBaseWhere(
    partnerFilter?: SQL,
    options?: { referenceSignedContractsOnly?: boolean },
  ): SQL {
    const parts: SQL[] = [eq(contracts.isDeleted, false)];
    if (partnerFilter) parts.push(partnerFilter);
    if (options?.referenceSignedContractsOnly) parts.push(eq(contracts.isActive, true));
    return parts.length === 1 ? parts[0] : and(...parts)!;
  }

  private async getContractsRows(
    preview: boolean,
    partnerFilter?: SQL,
    pagination?: PaginationParams,
    options?: { referenceSignedContractsOnly?: boolean },
  ) {
    const baseWhere = this.contractsListBaseWhere(partnerFilter, options);

    if (preview) {
      let query: any = this.db.db
        .select({ id: contracts.id, name: contracts.name, number: contracts.number })
        .from(contracts)
        .where(baseWhere)
        .orderBy(asc(contracts.number));
      if (pagination) query = query.limit(pagination.limit).offset(pagination.offset);
      return query;
    }

    let query: any = this.db.db.select().from(contracts).where(baseWhere).orderBy(asc(contracts.number));
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
    return rows.map(row => row.id).filter(Boolean) as string[];
  }

  private async getSignedStateIds(): Promise<string[]> {
    const rows = await this.db.db
      .select({ id: refContractStates.id })
      .from(refContractStates)
      .where(
        or(sql`lower(${refContractStates.code}) = 'signed'`, ilike(refContractStates.name, '%подписан%')),
      );
    return rows.map(row => row.id).filter(Boolean) as string[];
  }

  private async resolveIsActiveFromStateId(stateId: string | null): Promise<boolean> {
    if (!stateId) return false;
    const signedIds = await this.getSignedStateIds();
    return signedIds.includes(stateId);
  }

  private async rowHasDraftState(stateId: string | null): Promise<boolean> {
    if (!stateId) return false;
    const draftIds = await this.getDraftStateIds();
    return draftIds.includes(stateId);
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
    const requestFieldToColumn: Record<string, string> = {
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
    };
    const emptyMeansNull = new Set([
      'number',
      'cipher',
      'name',
      'description',
      'partnerId',
      'projectId',
      'responsibleId',
      'categoryId',
      'contractTypeId',
      'amountExclVat',
      'vatRate',
      'amountVat',
      'amountInclVat',
      'startDate',
      'endDate',
      'dateSigned',
    ]);
    const insertData: Record<string, unknown> = {};
    for (const [requestKey, columnKey] of Object.entries(requestFieldToColumn)) {
      let rawValue = data[requestKey];
      if (rawValue === undefined) continue;
      if (rawValue === '' || rawValue === null) {
        if (columnKey === 'stateId') continue;
        if (emptyMeansNull.has(columnKey)) insertData[columnKey] = null;
        continue;
      }
      insertData[columnKey] = rawValue;
    }
    let stateId = insertData.stateId;
    if (stateId == null || stateId === '') {
      const draftIds = await this.getDraftStateIds();
      stateId = draftIds[0];
    }
    if (!stateId) {
      throw new BadRequestException(
        'Не задано состояние договора и в справочнике не найдено состояние с кодом draft (черновик)',
      );
    }
    insertData.stateId = stateId;
    insertData.isActive = await this.resolveIsActiveFromStateId(String(stateId));
    const [row] = await this.db.db.insert(contracts).values(insertData as any).returning();
    this.invalidateListCache();
    await this.refreshPartnerDerivedStatusForPartnerIds([row?.partnerId]);
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
      const key = `contracts:for_reference:signed:${preview ? '1' : '0'}`;
      const cached = this.getValidCache(key);
      if (cached) return { data: cached.data, total: cached.total };
      const rows = await this.getContractsRows(!!preview, undefined, undefined, {
        referenceSignedContractsOnly: true,
      });
      const result = {
        data: this.mapContractsRows(rows, !!preview),
        total: rows.length,
      };
      this.setListCache(key, result);
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
        deletion_tab_counts: { active: 0, deleted: 0, all: 0 },
      };
    }

    const deletedScope: DeletedScope = filters?.deletedScope ?? 'active';

    const baseParts: SQL[] = [];
    if (partnerFilter) baseParts.push(partnerFilter);
    baseParts.push(...filterParts);

    const draftIds = await this.getDraftStateIds();

    const countForTab = async (tab: ContractListTab): Promise<number> => {
      const tabSql = this.contractListTabCondition(tab, draftIds);
      const parts = [
        ...(tabSql ? [...baseParts, tabSql] : [...baseParts]),
        ...sqlPartsForDeletedScope(contracts.isDeleted, 'active'),
      ];
      return this.countContractsWhere(this.mergeWhereParts(parts));
    };

    const listTab: ContractListTab = filters?.listTab ?? 'all';
    const listTabSql = this.contractListTabCondition(listTab, draftIds);
    const listParts = [
      ...(listTabSql ? [...baseParts, listTabSql] : [...baseParts]),
      ...sqlPartsForDeletedScope(contracts.isDeleted, deletedScope),
    ];
    const listWhere = this.mergeWhereParts(listParts);

    const partsForCurrentListTabOnly = listTabSql ? [...baseParts, listTabSql] : [...baseParts];
    const countDeletionSlice = (scope: DeletedScope) =>
      this.countContractsWhere(
        this.mergeWhereParts([
          ...partsForCurrentListTabOnly,
          ...sqlPartsForDeletedScope(contracts.isDeleted, scope),
        ]),
      );

    const [
      tabAll,
      tabActive,
      tabDraft,
      tabInactive,
      delActive,
      delDeleted,
      delAll,
      listTotal,
      rows,
    ] = await Promise.all([
      countForTab('all'),
      countForTab('active'),
      countForTab('draft'),
      countForTab('inactive'),
      countDeletionSlice('active'),
      countDeletionSlice('deleted'),
      countDeletionSlice('all'),
      this.countContractsWhere(listWhere),
      this.db.db
        .select()
        .from(contracts)
        .where(listWhere)
        .orderBy(asc(contracts.number))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      data: this.mapContractsRows(rows, false),
      total: listTotal,
      tab_counts: {
        all: tabAll,
        active: tabActive,
        draft: tabDraft,
        inactive: tabInactive,
      },
      deletion_tab_counts: {
        active: delActive,
        deleted: delDeleted,
        all: delAll,
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
    const existingContractRows = await this.db.db
      .select({ stateId: contracts.stateId, partnerId: contracts.partnerId })
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1);
    const existingContract = existingContractRows[0];
    if (!existingContract) return null;
    const partnerIdBefore = existingContract.partnerId ? String(existingContract.partnerId) : null;

    const requestFieldToColumn: Record<string, string> = {
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
    };
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    for (const [requestKey, columnKey] of Object.entries(requestFieldToColumn)) {
      if (data[requestKey] !== undefined) updatePayload[columnKey] = data[requestKey];
    }

    const stateIdSentInRequest = data.state_id;
    const hasNewStateIdInRequest =
      stateIdSentInRequest !== undefined && stateIdSentInRequest !== null && stateIdSentInRequest !== '';
    const resolvedStateIdForActiveFlag = hasNewStateIdInRequest
      ? String(stateIdSentInRequest)
      : existingContract.stateId != null
        ? String(existingContract.stateId)
        : null;

    const explicitIsActive = data.is_active;
    const hasExplicitIsActive =
      explicitIsActive !== undefined && explicitIsActive !== null && String(explicitIsActive) !== '';

    if (hasNewStateIdInRequest) {
      updatePayload.isActive = await this.resolveIsActiveFromStateId(String(stateIdSentInRequest));
    } else if (hasExplicitIsActive) {
      updatePayload.isActive = explicitIsActive === true || explicitIsActive === 'true';
    } else {
      updatePayload.isActive = await this.resolveIsActiveFromStateId(resolvedStateIdForActiveFlag);
    }

    await this.db.db.update(contracts).set(updatePayload).where(eq(contracts.id, id));
    this.invalidateListCache();
    const updated = await this.findOne(id);
    const partnerIdAfter =
      updated && (updated as { partner_id?: string }).partner_id
        ? String((updated as { partner_id: string }).partner_id)
        : null;
    await this.refreshPartnerDerivedStatusForPartnerIds([partnerIdBefore, partnerIdAfter]);
    return updated;
  }

  async remove(
    id: string,
  ): Promise<{ deletion_mode: 'soft'; contract: unknown } | { deletion_mode: 'hard'; id: string } | null> {
    const contractRows = await this.db.db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    const contractRow = contractRows[0];
    if (!contractRow) return null;
    const partnerIdForRefresh = contractRow.partnerId ? String(contractRow.partnerId) : null;

    const isDraftContract = await this.rowHasDraftState(contractRow.stateId);
    if (isDraftContract) {
      this.logger.debug(`Жёсткое удаление черновика договора id: ${id}`);
      await this.db.db
        .update(patents)
        .set({ contractId: null, updatedAt: new Date() })
        .where(eq(patents.contractId, id));
      await this.db.db.delete(contracts).where(eq(contracts.id, id));
      this.invalidateListCache();
      await this.refreshPartnerDerivedStatusForPartnerIds([partnerIdForRefresh]);
      return { deletion_mode: 'hard', id: String(contractRow.id) };
    }

    this.logger.debug(`Мягкое удаление договора id: ${id}`);
    await this.db.db
      .update(contracts)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(contracts.id, id));
    this.invalidateListCache();
    await this.refreshPartnerDerivedStatusForPartnerIds([partnerIdForRefresh]);
    const contractAfterSoftDelete = await this.findOne(id);
    if (!contractAfterSoftDelete) return null;
    return { deletion_mode: 'soft', contract: contractAfterSoftDelete };
  }

  async restore(id: string) {
    this.logger.debug(`Восстановление договора id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .update(contracts)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(contracts.id, id));
    this.invalidateListCache();
    const restored = await this.findOne(id);
    const pid =
      restored && (restored as { partner_id?: string }).partner_id
        ? String((restored as { partner_id: string }).partner_id)
        : null;
    await this.refreshPartnerDerivedStatusForPartnerIds([pid]);
    return restored;
  }

  private toResponse(row: (typeof contracts.$inferSelect)) {
    return {
      id: String(row.id),
      number: row.number ?? '',
      cipher: row.cipher ?? '',
      name: row.name ?? '',
      description: row.description ?? '',
      partner_id: row.partnerId ? String(row.partnerId) : '',
      project_id: row.projectId ? String(row.projectId) : '',
      responsible_id: row.responsibleId ? String(row.responsibleId) : '',
      category_id: row.categoryId ? String(row.categoryId) : '',
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
      is_deleted: row.isDeleted ?? false,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}