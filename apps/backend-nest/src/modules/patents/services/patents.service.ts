import type { SQL } from 'drizzle-orm';
import { and, asc, count, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  patents,
  relPatentsApplicationAreas,
  patentGrants,
  relPatentAuthors,
} from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';
import { type DeletedScope, sqlPartsForDeletedScope } from '../../../common/deleted-scope';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PatentFindAllParams {
  preview: boolean;
  deletedScope: DeletedScope;
  pagination: PaginationParams;
  search?: string;
  departmentId?: string;
  statusId?: string;
  authorIds: string[];
  createdBy?: string;
}

export interface PatentsListPayload {
  data: unknown[];
  total: number;
  tab_counts: { active: number; deleted: number; all: number };
}

@Injectable()
export class PatentsService {
  private readonly logger = new Logger(PatentsService.name);

  constructor(private readonly db: DatabaseService) {}

  private async patentExists(patentId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ id: patents.id })
      .from(patents)
      .where(eq(patents.id, patentId))
      .limit(1);
    return Boolean(rows[0]);
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(patents)
      .where(eq(patents.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [areaIds, authorIds] = await Promise.all([
      this.getAreaIdsForPatent(id),
      this.getAuthorIdsForPatent(id),
    ]);
    return this.toResponse(row, areaIds, authorIds);
  }

  private async getAreaIdsForPatent(patentId: string): Promise<string[]> {
    const relRows = await this.db.db
      .select({ areaId: relPatentsApplicationAreas.areaId })
      .from(relPatentsApplicationAreas)
      .where(eq(relPatentsApplicationAreas.patentId, patentId));
    return relRows.filter((relRow) => relRow.areaId != null).map((relRow) => String(relRow.areaId));
  }

  private async getAuthorIdsForPatent(patentId: string): Promise<string[]> {
    try {
      const relRows = await this.db.db
        .select({ userId: relPatentAuthors.userId })
        .from(relPatentAuthors)
        .where(eq(relPatentAuthors.patentId, patentId));
      return relRows.filter((relRow) => relRow.userId != null).map((relRow) => String(relRow.userId));
    } catch {
      return [];
    }
  }

  private async getAreaIdsMap(patentIds: string[]): Promise<Record<string, string[]>> {
    if (patentIds.length === 0) return {};
    const relRows = await this.db.db
      .select()
      .from(relPatentsApplicationAreas)
      .where(inArray(relPatentsApplicationAreas.patentId, patentIds));
    const map: Record<string, string[]> = {};
    for (const relRow of relRows) {
      if (relRow.patentId) {
        const pid = String(relRow.patentId);
        if (!map[pid]) map[pid] = [];
        if (relRow.areaId) map[pid].push(String(relRow.areaId));
      }
    }
    return map;
  }

  private async getAuthorIdsMap(patentIds: string[]): Promise<Record<string, string[]>> {
    if (patentIds.length === 0) return {};
    try {
      const relRows = await this.db.db
        .select()
        .from(relPatentAuthors)
        .where(inArray(relPatentAuthors.patentId, patentIds));
      const map: Record<string, string[]> = {};
      for (const relRow of relRows) {
        if (relRow.patentId) {
          const pid = String(relRow.patentId);
          if (!map[pid]) map[pid] = [];
          if (relRow.userId) map[pid].push(String(relRow.userId));
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  private buildPatentFilterParts(params: {
    search?: string;
    departmentId?: string;
    statusId?: string;
    authorIds: string[];
    createdBy?: string;
  }): SQL[] {
    const parts: SQL[] = [];

    const rawSearch = params.search?.trim();
    if (rawSearch) {
      const safe = rawSearch.replace(/[%_]/g, '');
      if (safe.length > 0) {
        const pattern = `%${safe}%`;
        parts.push(
          or(
            ilike(patents.name, pattern),
            ilike(patents.registrationNumber, pattern),
            ilike(patents.kdNumber, pattern),
            ilike(patents.applicationNumber, pattern),
          )!,
        );
      }
    }

    if (params.departmentId && UUID_RE.test(params.departmentId)) {
      parts.push(eq(patents.departmentId, params.departmentId));
    }
    if (params.statusId && UUID_RE.test(params.statusId)) {
      parts.push(eq(patents.statusId, params.statusId));
    }
    if (params.createdBy && UUID_RE.test(params.createdBy)) {
      parts.push(eq(patents.createdBy, params.createdBy));
    }

    const validAuthorIds = params.authorIds.filter((id) => UUID_RE.test(id));
    if (validAuthorIds.length > 0) {
      parts.push(
        exists(
          this.db.db
            .select({ one: sql`1` })
            .from(relPatentAuthors)
            .where(
              and(
                eq(relPatentAuthors.patentId, patents.id),
                inArray(relPatentAuthors.userId, validAuthorIds),
              ),
            ),
        ),
      );
    }

    return parts;
  }

  private whereForListScope(baseParts: SQL[], deletedScope: DeletedScope): SQL {
    const parts = [...baseParts, ...sqlPartsForDeletedScope(patents.isDeleted, deletedScope)];
    return parts.length > 0 ? and(...parts)! : sql`true`;
  }

  private async countPatentsWhere(where: SQL): Promise<number> {
    const rows = await this.db.db.select({ value: count() }).from(patents).where(where);
    return Number(rows[0]?.value ?? 0);
  }

  async findAll(params: PatentFindAllParams): Promise<PatentsListPayload | unknown[]> {
    const {
      preview,
      deletedScope,
      pagination,
      search,
      departmentId,
      statusId,
      authorIds,
      createdBy,
    } = params;
    const { limit = 50, offset = 0 } = pagination;

    const baseParts = this.buildPatentFilterParts({
      search,
      departmentId,
      statusId,
      authorIds,
      createdBy,
    });
    const listWhere = this.whereForListScope(baseParts, deletedScope);

    if (preview) {
      const rows = await this.db.db
        .select({ id: patents.id, name: patents.name })
        .from(patents)
        .where(listWhere)
        .orderBy(asc(patents.name))
        .limit(limit)
        .offset(offset);
      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name ?? ''),
      }));
    }

    const whereActive = this.whereForListScope(baseParts, 'active');
    const whereDeleted = this.whereForListScope(baseParts, 'deleted');
    const whereAll = this.whereForListScope(baseParts, 'all');

    const [tabActive, tabDeleted, tabAll, rows] = await Promise.all([
      this.countPatentsWhere(whereActive),
      this.countPatentsWhere(whereDeleted),
      this.countPatentsWhere(whereAll),
      this.db.db
        .select()
        .from(patents)
        .where(listWhere)
        .orderBy(asc(patents.name))
        .limit(limit)
        .offset(offset),
    ]);

    const total =
      deletedScope === 'active' ? tabActive : deletedScope === 'deleted' ? tabDeleted : tabAll;

    const patentIds = rows.map((row) => String(row.id));
    const [areaIdsMap, authorIdsMap] = await Promise.all([
      this.getAreaIdsMap(patentIds),
      this.getAuthorIdsMap(patentIds),
    ]);
    const data = rows.map((row) =>
      this.toResponse(row, areaIdsMap[String(row.id)] ?? [], authorIdsMap[String(row.id)] ?? []),
    );

    return {
      data,
      total,
      tab_counts: { active: tabActive, deleted: tabDeleted, all: tabAll },
    };
  }

  private toResponse(
    row: (typeof patents.$inferSelect),
    areaIds: string[] = [],
    authorIds: string[] = [],
  ) {
    return {
      id: String(row.id),
      registration_number: row.registrationNumber ?? '',
      registration_date: row.registrationDate ? String(row.registrationDate) : '',
      registration_number_cir: row.registrationNumberCir ?? '',
      registration_date_cir: row.registrationDateCir ? String(row.registrationDateCir) : '',
      application_number: row.applicationNumber ?? '',
      name: row.name ?? '',
      department_id: String(row.departmentId ?? ''),
      contract_id: row.contractId ? String(row.contractId) : '',
      project_id: row.projectId ? String(row.projectId) : '',
      responsible_for_patenting_id: row.responsibleForPatentId ? String(row.responsibleForPatentId) : '',
      kd_number: row.kdNumber ?? '',
      intellectprop_id: (row.intellectpropId ?? row.intellectualPropertyTypeId) ? String(row.intellectpropId ?? row.intellectualPropertyTypeId) : '',
      status_id: row.statusId ? String(row.statusId) : '',
      is_deleted: row.isDeleted ?? false,
      author_ids: authorIds,
      area_ids: areaIds,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
      created_by: row.createdBy ? String(row.createdBy) : '',
    };
  }

  async create(data: Record<string, unknown>) {
    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const departmentId = toUuid(data.department_id);
    if (!departmentId) throw new BadRequestException('department_id обязателен');
    const insertData = {
      name: data.name != null ? String(data.name) : '',
      registrationNumber: data.registration_number != null ? String(data.registration_number) : null,
      registrationDate: toDateStr(data.registration_date),
      registrationNumberCir: data.registration_number_cir != null ? String(data.registration_number_cir) : null,
      registrationDateCir: toDateStr(data.registration_date_cir),
      applicationNumber: data.application_number != null ? String(data.application_number) : null,
      departmentId,
      contractId: toUuid(data.contract_id),
      projectId: toUuid(data.project_id),
      kdNumber: data.kd_number != null ? String(data.kd_number) : null,
      intellectpropId: toUuid(data.intellectprop_id),
      intellectualPropertyTypeId: toUuid(data.intellectual_property_type_id),
      statusId: toUuid(data.status_id),
      responsibleForPatentId: toUuid(data.responsible_for_patenting_id),
    };
    const [row] = await this.db.db.insert(patents).values(insertData).returning();
    if (!row) return null;
    const patentId = String(row.id);
    await this.syncAreaIds(patentId, data);
    await this.syncAuthorIds(patentId, data);
    return this.findOne(patentId);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    if (!current) return null;
    await this.db.db
      .update(patents)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(patents.id, id));
    return this.findOne(id);
  }

  async update(id: string, data: Record<string, unknown>) {
    const current = await this.findOne(id);
    if (!current) return null;
    const map: Record<string, string> = {
      name: 'name',
      registration_number: 'registrationNumber',
      registration_date: 'registrationDate',
      registration_number_cir: 'registrationNumberCir',
      registration_date_cir: 'registrationDateCir',
      application_number: 'applicationNumber',
      department_id: 'departmentId',
      contract_id: 'contractId',
      project_id: 'projectId',
      kd_number: 'kdNumber',
      intellectprop_id: 'intellectpropId',
      intellectual_property_type_id: 'intellectualPropertyTypeId',
      status_id: 'statusId',
      responsible_for_patenting_id: 'responsibleForPatentId',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) {
        const val = data[snake];
        updateObj[camel] = val == null || val === '' ? null : val;
      }
    }
    await this.db.db.update(patents).set(updateObj).where(eq(patents.id, id));
    await this.syncAreaIds(id, data);
    await this.syncAuthorIds(id, data);
    return this.findOne(id);
  }

  async restore(id: string) {
    const current = await this.findOne(id);
    if (!current) return null;
    await this.db.db
      .update(patents)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(patents.id, id));
    return this.findOne(id);
  }

  private async syncAreaIds(patentId: string, data: Record<string, unknown>) {
    const areaIds = Array.isArray(data.area_ids) ? data.area_ids.filter((x): x is string => typeof x === 'string') : [];
    await this.db.db.delete(relPatentsApplicationAreas).where(eq(relPatentsApplicationAreas.patentId, patentId));
    if (areaIds.length) {
      await this.db.db.insert(relPatentsApplicationAreas).values(
        areaIds.map((areaId) => ({ patentId, areaId })),
      );
    }
  }

  private async syncAuthorIds(patentId: string, data: Record<string, unknown>) {
    const rawIds = Array.isArray(data.author_ids) ? data.author_ids : [];
    const authorIds = rawIds
      .map((value) => (value != null && value !== '' ? String(value) : null))
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (authorIds.length === 0) {
      await this.db.db.delete(relPatentAuthors).where(eq(relPatentAuthors.patentId, patentId));
      return;
    }
    try {
      await this.db.db.delete(relPatentAuthors).where(eq(relPatentAuthors.patentId, patentId));
      await this.db.db.insert(relPatentAuthors).values(
        authorIds.map((userId) => ({ patentId, userId })),
      );
    } catch (err) {
      this.logger.error(
        `Не удалось сохранить авторов патента (проверьте таблицу rel_patents_users: patent_id uuid, user_id uuid): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getGrants(patentId: string) {
    if (!(await this.patentExists(patentId))) return null;
    try {
      const rows = await this.db.db
        .select()
        .from(patentGrants)
        .where(eq(patentGrants.patentId, patentId))
        .orderBy(asc(patentGrants.grantDate));
      return rows.map((row) => ({
        id: String(row.id),
        patent_id: row.patentId ? String(row.patentId) : '',
        grant_number: row.grantNumber ?? '',
        grant_date: row.grantDate ? String(row.grantDate) : '',
        office: row.office ?? '',
        status: row.status ?? '',
        renewal_date: row.renewalDate ? String(row.renewalDate) : '',
        notes: row.notes ?? '',
        created_at: row.createdAt ? row.createdAt.toISOString() : '',
        updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
      }));
    } catch {
      return [];
    }
  }

  async createGrant(patentId: string, data: Record<string, unknown>) {
    if (!(await this.patentExists(patentId))) return null;
    const insertData: Record<string, unknown> = {
      patentId,
      grantNumber: data.grant_number ?? null,
      grantDate: data.grant_date ?? null,
      office: data.office ?? null,
      status: data.status ?? null,
      renewalDate: data.renewal_date ?? null,
      notes: data.notes ?? null,
    };
    const [row] = await this.db.db.insert(patentGrants).values(insertData).returning();
    if (!row) return null;
    const grants = await this.getGrants(patentId);
    return grants ? grants[grants.length - 1] : null;
  }
}
