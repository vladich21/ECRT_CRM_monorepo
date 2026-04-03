import type { SQL } from 'drizzle-orm';
import { and, asc, count, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { projects } from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';
import type { DeletedScope, DeletionTabCounts } from '../../../common/deleted-scope';
import { sqlPartsForDeletedScope } from '../../../common/deleted-scope';

const REQUIRED_CREATE_FIELDS = ['code', 'name', 'short_name', 'start_date', 'status'] as const;

export type ProjectListTab =
  | 'all'
  | 'active'
  | 'completed'
  | 'pending'
  | 'paused'
  | 'cancelled';

export type ProjectEndDatePresence = 'set' | 'empty';

export interface ProjectQueryFilters {
  search?: string;
  listTab?: ProjectListTab;
  deletedScope?: DeletedScope;
  managerId?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  endDatePresence?: ProjectEndDatePresence;
}

export interface ProjectTabCounts {
  all: number;
  active: number;
  completed: number;
  pending: number;
  paused: number;
  cancelled: number;
}

export type ProjectsFindAllResult =
  | { id: string; name: string; code: string }[]
  | { data: unknown[]; total: number; tab_counts: ProjectTabCounts; deletion_tab_counts: DeletionTabCounts };

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly db: DatabaseService) {}

  private mergeWhereParts(parts: SQL[]): SQL {
    if (parts.length === 0) {
      return sql`true`;
    }
    if (parts.length === 1) return parts[0];
    return and(...parts)!;
  }

  private async countWhere(where: SQL): Promise<number> {
    const result = await this.db.db.select({ value: count() }).from(projects).where(where);
    return Number(result[0]?.value ?? 0);
  }

  private buildBaseFilterParts(filters?: ProjectQueryFilters): SQL[] | null {
    const parts: SQL[] = [];
    if (!filters) return parts;

    if (filters.managerId) {
      parts.push(eq(projects.managerId, filters.managerId));
    }

    if (filters.createdBy) {
      parts.push(eq(projects.createdBy, filters.createdBy));
    }

    if (filters.dateFrom && filters.dateTo) {
      parts.push(
        and(
          lte(projects.startDate, filters.dateTo),
          gte(sql`COALESCE(${projects.endDate}, ${projects.startDate})`, filters.dateFrom),
        )!,
      );
    }

    if (filters.startDateFrom) {
      parts.push(gte(projects.startDate, filters.startDateFrom));
    }
    if (filters.startDateTo) {
      parts.push(lte(projects.startDate, filters.startDateTo));
    }

    if (filters.endDateFrom) {
      parts.push(
        and(isNotNull(projects.endDate), gte(projects.endDate, filters.endDateFrom))!,
      );
    }
    if (filters.endDateTo) {
      parts.push(
        and(isNotNull(projects.endDate), lte(projects.endDate, filters.endDateTo))!,
      );
    }

    if (filters.endDatePresence === 'set') {
      parts.push(isNotNull(projects.endDate));
    } else if (filters.endDatePresence === 'empty') {
      parts.push(isNull(projects.endDate));
    }

    const raw = filters.search?.trim();
    if (raw) {
      const safe = raw.replace(/[%_\\]/g, '');
      if (!safe) return null;
      const term = `%${safe}%`;
      parts.push(
        or(
          ilike(projects.name, term),
          ilike(projects.shortName, term),
          ilike(projects.code, term),
          ilike(projects.description, term),
        )!,
      );
    }

    return parts;
  }

  private tabStatusCondition(tab: ProjectListTab): SQL | undefined {
    if (tab === 'all') return undefined;
    return eq(projects.status, tab);
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {

    const missing = REQUIRED_CREATE_FIELDS.filter((field) => {
      const fieldValue = data[field];
      return fieldValue === undefined || fieldValue === null || (typeof fieldValue === 'string' && fieldValue.trim() === '');
    });
    if (missing.length > 0) {
      this.logger.warn(`Создание проекта: не заполнены обязательные поля: ${missing.join(', ')}`);
      throw new BadRequestException(
        `Обязательные поля не заполнены: ${missing.join(', ')}. Требуются: код, название, короткое название, дата начала, статус.`,
      );
    }

    const insertData = this.mapToDb(data);
    const [row] = await this.db.db.insert(projects).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    const map: Record<string, string> = {
      code: 'code',
      name: 'name',
      short_name: 'shortName',
      description: 'description',
      start_date: 'startDate',
      end_date: 'endDate',
      manager_id: 'managerId',
      purchaser_id: 'purchaserId',
      status: 'status',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) updateObj[camel] = data[snake];
    }
    await this.db.db.update(projects).set(updateObj).where(eq(projects.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .update(projects)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(projects.id, id));
    return this.findOne(id);
  }

  async restore(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .update(projects)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(projects.id, id));
    return this.findOne(id);
  }

  private mapToDb(data: Record<string, unknown>) {
    const toDate = (value: unknown): string | null =>
      value == null || value === '' ? null : typeof value === 'string' ? value : null;
    const toUuid = (value: unknown): string | null =>
      value == null || value === '' ? null : typeof value === 'string' ? value : null;

    const code = data.code != null ? String(data.code) : null;
    const name = data.name != null ? String(data.name) : null;
    const shortName = data.short_name != null ? String(data.short_name) : null;
    const startDate = toDate(data.start_date);
    const status = data.status != null ? String(data.status) : null;

    return {
      code,
      name,
      shortName,
      description: data.description != null ? String(data.description) : null,
      startDate,
      endDate: toDate(data.end_date),
      managerId: toUuid(data.manager_id),
      purchaserId: toUuid(data.purchaser_id),
      status,
    };
  }

  async findAll(options: {
    preview?: boolean;
    pagination?: PaginationParams;
    filters?: ProjectQueryFilters;
  }): Promise<ProjectsFindAllResult> {
    const { preview, pagination, filters } = options;

    if (preview) {
      const rows = await this.db.db
        .select({ id: projects.id, name: projects.name, code: projects.code, managerId: projects.managerId, purchaserId: projects.purchaserId })
        .from(projects)
        .where(eq(projects.isDeleted, false))
        .orderBy(asc(projects.name));
      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name ?? ''),
        code: String(row.code ?? ''),
        manager_id: row.managerId ? String(row.managerId) : null,
        purchaser_id: row.purchaserId ? String(row.purchaserId) : null,
      }));
    }

    const { limit = 50, offset = 0 } = pagination ?? {};
    const basePartsResult = this.buildBaseFilterParts(filters);
    if (basePartsResult === null) {
      const zeros: ProjectTabCounts = {
        all: 0,
        active: 0,
        completed: 0,
        pending: 0,
        paused: 0,
        cancelled: 0,
      };
      return {
        data: [],
        total: 0,
        tab_counts: zeros,
        deletion_tab_counts: { active: 0, deleted: 0, all: 0 },
      };
    }

    const deletedScope: DeletedScope = filters?.deletedScope ?? 'active';
    const baseParts = basePartsResult;
    const tabs: ProjectListTab[] = [
      'all',
      'active',
      'completed',
      'pending',
      'paused',
      'cancelled',
    ];

    const countForTab = async (tab: ProjectListTab): Promise<number> => {
      const tabSql = this.tabStatusCondition(tab);
      const parts = [
        ...(tabSql ? [...baseParts, tabSql] : [...baseParts]),
        ...sqlPartsForDeletedScope(projects.isDeleted, 'all'),
      ];
      const where = this.mergeWhereParts(parts);
      return this.countWhere(where);
    };

    const listTab: ProjectListTab = filters?.listTab ?? 'all';
    const listTabSql = this.tabStatusCondition(listTab);
    const listParts = [
      ...(listTabSql ? [...baseParts, listTabSql] : [...baseParts]),
      ...sqlPartsForDeletedScope(projects.isDeleted, deletedScope),
    ];
    const listWhere = this.mergeWhereParts(listParts);

    const partsForCurrentListTabOnly = listTabSql ? [...baseParts, listTabSql] : [...baseParts];
    const countDeletionSlice = (scope: DeletedScope) =>
      this.countWhere(
        this.mergeWhereParts([
          ...partsForCurrentListTabOnly,
          ...sqlPartsForDeletedScope(projects.isDeleted, scope),
        ]),
      );

    const countPromises = tabs.map((t) => countForTab(t));
    const [counts, delActive, delDeleted, delAll, listTotal, rows] = await Promise.all([
      Promise.all(countPromises),
      countDeletionSlice('active'),
      countDeletionSlice('deleted'),
      countDeletionSlice('all'),
      this.countWhere(listWhere),
      this.db.db
        .select()
        .from(projects)
        .where(listWhere)
        .orderBy(asc(projects.name))
        .limit(limit)
        .offset(offset),
    ]);

    const tab_counts: ProjectTabCounts = {
      all: counts[0],
      active: counts[1],
      completed: counts[2],
      pending: counts[3],
      paused: counts[4],
      cancelled: counts[5],
    };

    return {
      data: rows.map((row) => this.toResponse(row)),
      total: listTotal,
      tab_counts,
      deletion_tab_counts: {
        active: delActive,
        deleted: delDeleted,
        all: delAll,
      },
    };
  }

  private toResponse(row: (typeof projects.$inferSelect)) {
    return {
      id: String(row.id),
      code: row.code ?? '',
      name: row.name ?? '',
      short_name: row.shortName ?? '',
      description: row.description ?? '',
      start_date: row.startDate ? String(row.startDate) : null,
      end_date: row.endDate ? String(row.endDate) : null,
      manager_id: row.managerId ? String(row.managerId) : null,
      purchaser_id: row.purchaserId ? String(row.purchaserId) : null,
      created_by: row.createdBy ? String(row.createdBy) : null,
      status: row.status ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : null,
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
      is_deleted: row.isDeleted ?? false,
    };
  }
}
