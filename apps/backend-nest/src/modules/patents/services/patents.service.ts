import { asc, count, eq, inArray, sql } from 'drizzle-orm';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  patents,
  relPatentsApplicationAreas,
  patentGrants,
  relPatentAuthors,
} from '../../../database/schema';
import { PaginationParams } from '../../../common/pagination';

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
    this.logger.debug(`Получение патента по id: ${id}`);
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
    return relRows.filter((r) => r.areaId != null).map((r) => String(r.areaId));
  }

  private async getAuthorIdsForPatent(patentId: string): Promise<string[]> {
    try {
      const relRows = await this.db.db
        .select({ userId: relPatentAuthors.userId })
        .from(relPatentAuthors)
        .where(eq(relPatentAuthors.patentId, patentId));
      return relRows.filter((r) => r.userId != null).map((r) => String(r.userId));
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
    for (const r of relRows) {
      if (r.patentId) {
        const pid = String(r.patentId);
        if (!map[pid]) map[pid] = [];
        if (r.areaId) map[pid].push(String(r.areaId));
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
      for (const r of relRows) {
        if (r.patentId) {
          const pid = String(r.patentId);
          if (!map[pid]) map[pid] = [];
          if (r.userId) map[pid].push(String(r.userId));
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  async findAll(
    preview?: boolean,
    isDeleted?: boolean,
    pagination?: PaginationParams,
  ): Promise<{ data: unknown[]; total: number } | unknown[]> {
    this.logger.debug(`Получение патентов (preview=${preview}, is_deleted=${isDeleted})`);
    const { limit = 50, offset = 0 } = pagination ?? { limit: 50, offset: 0 };
    const where = isDeleted !== undefined ? eq(patents.isDeleted, isDeleted) : undefined;

    if (preview) {
      const rows = await this.db.db
        .select({ id: patents.id, name: patents.name })
        .from(patents)
        .where(where ?? sql`true`)
        .orderBy(asc(patents.name))
        .limit(limit)
        .offset(offset);
      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
      }));
    }

    const runCount = async (): Promise<number> => {
      let q = this.db.db.select({ value: count() }).from(patents);
      if (where) q = q.where(where) as typeof q;
      const result = await q;
      return Number(result[0]?.value ?? 0);
    };

    const [total, rows] = await Promise.all([
      runCount(),
      this.db.db
        .select()
        .from(patents)
        .where(where ?? sql`true`)
        .orderBy(asc(patents.name))
        .limit(limit)
        .offset(offset),
    ]);
    const patentIds = rows.map((r) => String(r.id));
    const [areaIdsMap, authorIdsMap] = await Promise.all([
      this.getAreaIdsMap(patentIds),
      this.getAuthorIdsMap(patentIds),
    ]);
    const data = rows.map((r) =>
      this.toResponse(r, areaIdsMap[String(r.id)] ?? [], authorIdsMap[String(r.id)] ?? []),
    );
    return { data, total };
  }

  private toResponse(
    r: (typeof patents.$inferSelect),
    areaIds: string[] = [],
    authorIds: string[] = [],
  ) {
    return {
      id: String(r.id),
      registration_number: r.registrationNumber ?? '',
      registration_date: r.registrationDate ? String(r.registrationDate) : '',
      registration_number_cir: r.registrationNumberCir ?? '',
      registration_date_cir: r.registrationDateCir ? String(r.registrationDateCir) : '',
      application_number: r.applicationNumber ?? '',
      name: r.name ?? '',
      department_id: String(r.departmentId ?? ''),
      contract_id: r.contractId ? String(r.contractId) : '',
      project_id: r.projectId ? String(r.projectId) : '',
      responsible_for_patenting_id: r.responsibleForPatentId ? String(r.responsibleForPatentId) : '',
      kd_number: r.kdNumber ?? '',
      intellectprop_id: (r.intellectpropId ?? r.intellectualPropertyTypeId) ? String(r.intellectpropId ?? r.intellectualPropertyTypeId) : '',
      status_id: r.statusId ? String(r.statusId) : '',
      is_deleted: r.isDeleted ?? false,
      author_ids: authorIds,
      area_ids: areaIds,
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
      created_by: r.createdBy ? String(r.createdBy) : '',
    };
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание патента');
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
    this.logger.debug(`Мягкое удаление патента id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
    await this.db.db
      .update(patents)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(patents.id, id));
    return this.findOne(id);
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление патента id: ${id}`);
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
    this.logger.debug(`Восстановление патента id: ${id}`);
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
      .map((x) => (x != null && x !== '' ? String(x) : null))
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
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
    this.logger.debug(`Получение grants для патента ${patentId}`);
    if (!(await this.patentExists(patentId))) return null;
    try {
      const rows = await this.db.db
        .select()
        .from(patentGrants)
        .where(eq(patentGrants.patentId, patentId))
        .orderBy(asc(patentGrants.grantDate));
      return rows.map((r) => ({
        id: String(r.id),
        patent_id: r.patentId ? String(r.patentId) : '',
        grant_number: r.grantNumber ?? '',
        grant_date: r.grantDate ? String(r.grantDate) : '',
        office: r.office ?? '',
        status: r.status ?? '',
        renewal_date: r.renewalDate ? String(r.renewalDate) : '',
        notes: r.notes ?? '',
        created_at: r.createdAt ? r.createdAt.toISOString() : '',
        updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
      }));
    } catch {
      return [];
    }
  }

  async createGrant(patentId: string, data: Record<string, unknown>) {
    this.logger.debug(`Добавление grant для патента ${patentId}`);
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
