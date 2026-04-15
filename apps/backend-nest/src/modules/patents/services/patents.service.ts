import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, exists, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  contracts,
  patents,
  projects,
  refPatentStatuses,
  relPatentsApplicationAreas,
  patentGrants,
  relPatentAuthors,
} from '../../../database/schema';
import { isPatentRidTransformationStatusName } from '../patent-rid-transformation.util';
import { mapPatentGrantToApiDto } from '../../patent-grants/patent-grant.mapper';
import { PaginationParams } from '../../../common/pagination';
import { type DeletedScope, sqlPartsForDeletedScope } from '../../../common/deleted-scope';
import {
  appendPatentGrantRegionFilter,
  type PatentGrantRegionKey,
} from '../patent-grant-region-filter';

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
  areaIds: string[];
  responsibleForPatentingId?: string;
  registrationYears?: number[];
  registrationCirYears?: number[];
  projectId?: string;
  contractId?: string;
  grantRegionKeys?: PatentGrantRegionKey[];
}

export interface PatentsListPayload {
  data: unknown[];
  total: number;
  tab_counts: { active: number; deleted: number; all: number };
}

const PATENT_LIST_GRANT_PREVIEW_LIMIT = 4;

type PatentGrantListPreviewForApi = {
  count: number;
  preview: Array<{
    grant_number: string;
    grant_date: string;
    office: string;
    status: string;
  }>;
};

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

  async findLinkedContractIds(deletedScope: DeletedScope): Promise<string[]> {
    const scopeParts = sqlPartsForDeletedScope(patents.isDeleted, deletedScope);
    const whereClause =
      scopeParts.length > 0
        ? and(isNotNull(patents.contractId), ...scopeParts)!
        : isNotNull(patents.contractId);
    const rows = await this.db.db
      .selectDistinct({ contractId: patents.contractId })
      .from(patents)
      .where(whereClause);
    return rows
      .map((row) => (row.contractId ? String(row.contractId) : ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
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
    const base = this.toResponse(row, areaIds, authorIds);
    return this.enrichPatentTransformationSnapshots(base, row);
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

  private async getPatentGrantsPreviewByPatentIds(
    patentIds: string[],
  ): Promise<Record<string, PatentGrantListPreviewForApi>> {
    if (patentIds.length === 0) {
      return {};
    }

    const grantRowsForPage = await this.db.db
      .select()
      .from(patentGrants)
      .where(inArray(patentGrants.patentId, patentIds));

    type GrantTableRow = (typeof patentGrants.$inferSelect);
    const grantsByPatentId: Record<string, GrantTableRow[]> = {};

    for (const grantRow of grantRowsForPage) {
      if (!grantRow.patentId) {
        continue;
      }
      const patentId = String(grantRow.patentId);
      if (!grantsByPatentId[patentId]) {
        grantsByPatentId[patentId] = [];
      }
      grantsByPatentId[patentId].push(grantRow);
    }

    const previewByPatentId: Record<string, PatentGrantListPreviewForApi> = {};

    for (const patentId of patentIds) {
      const grantsForThisPatent = grantsByPatentId[patentId] ?? [];
      if (grantsForThisPatent.length === 0) {
        continue;
      }

      const sortedByGrantDateNewestFirst = [...grantsForThisPatent].sort((left, right) => {
        const leftMillis = left.grantDate ? new Date(String(left.grantDate)).getTime() : 0;
        const rightMillis = right.grantDate ? new Date(String(right.grantDate)).getTime() : 0;
        if (rightMillis !== leftMillis) {
          return rightMillis - leftMillis;
        }
        return String(right.id).localeCompare(String(left.id));
      });

      const previewItems = sortedByGrantDateNewestFirst
        .slice(0, PATENT_LIST_GRANT_PREVIEW_LIMIT)
        .map((grantRow) => ({
          grant_number: grantRow.grantNumber ?? '',
          grant_date: grantRow.grantDate ? String(grantRow.grantDate) : '',
          office: grantRow.office ?? '',
          status: grantRow.status ?? '',
        }));

      previewByPatentId[patentId] = {
        count: grantsForThisPatent.length,
        preview: previewItems,
      };
    }

    return previewByPatentId;
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
    areaIds: string[];
    responsibleForPatentingId?: string;
    registrationYears?: number[];
    registrationCirYears?: number[];
    projectId?: string;
    contractId?: string;
    grantRegionKeys?: PatentGrantRegionKey[];
  }): SQL[] {
    const parts: SQL[] = [];

    const rawSearch = params.search?.trim();
    if (rawSearch) {
      const safe = rawSearch.replace(/[%_]/g, '');
      if (safe.length > 0) {
        const pattern = `%${safe}%`;
        const contractMatch = exists(
          this.db.db
            .select({ one: sql`1` })
            .from(contracts)
            .where(
              and(
                eq(contracts.id, patents.contractId),
                or(
                  ilike(contracts.cipher, pattern),
                  ilike(contracts.number, pattern),
                  ilike(contracts.name, pattern),
                )!,
              ),
            ),
        );
        const projectMatch = exists(
          this.db.db
            .select({ one: sql`1` })
            .from(projects)
            .where(
              and(
                eq(projects.id, patents.projectId),
                or(ilike(projects.code, pattern), ilike(projects.name, pattern))!,
              ),
            ),
        );
        parts.push(
          or(
            ilike(patents.name, pattern),
            ilike(patents.registrationNumber, pattern),
            ilike(patents.kdNumber, pattern),
            ilike(patents.applicationNumber, pattern),
            ilike(patents.registrationNumberCir, pattern),
            contractMatch,
            projectMatch,
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
    if (params.responsibleForPatentingId && UUID_RE.test(params.responsibleForPatentingId)) {
      parts.push(eq(patents.responsibleForPatentId, params.responsibleForPatentingId));
    }

    const years = (params.registrationYears ?? []).filter(
      (y) => Number.isInteger(y) && y >= 1900 && y <= 2100,
    );
    if (years.length > 0) {
      parts.push(
        sql`extract(year from ${patents.registrationDate})::int in (${sql.join(
          years.map((y) => sql`${y}`),
          sql`, `,
        )})`,
      );
    }

    const cirYears = (params.registrationCirYears ?? []).filter(
      (y) => Number.isInteger(y) && y >= 1900 && y <= 2100,
    );
    if (cirYears.length > 0) {
      parts.push(
        sql`extract(year from ${patents.registrationDateCir})::int in (${sql.join(
          cirYears.map((y) => sql`${y}`),
          sql`, `,
        )})`,
      );
    }

    if (params.projectId && UUID_RE.test(params.projectId)) {
      parts.push(eq(patents.projectId, params.projectId));
    }

    if (params.contractId && UUID_RE.test(params.contractId)) {
      parts.push(eq(patents.contractId, params.contractId));
    }

    appendPatentGrantRegionFilter(parts, this.db.db, params.grantRegionKeys ?? []);

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

    const validAreaIds = params.areaIds.filter((id) => UUID_RE.test(id));
    if (validAreaIds.length > 0) {
      parts.push(
        exists(
          this.db.db
            .select({ one: sql`1` })
            .from(relPatentsApplicationAreas)
            .where(
              and(
                eq(relPatentsApplicationAreas.patentId, patents.id),
                inArray(relPatentsApplicationAreas.areaId, validAreaIds),
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
      areaIds,
      responsibleForPatentingId,
      registrationYears,
      registrationCirYears,
      projectId,
      contractId,
      grantRegionKeys,
    } = params;
    const { limit = 50, offset = 0 } = pagination;

    const baseParts = this.buildPatentFilterParts({
      search,
      departmentId,
      statusId,
      authorIds,
      areaIds,
      responsibleForPatentingId,
      registrationYears,
      registrationCirYears,
      projectId,
      contractId,
      grantRegionKeys,
    });
    const listWhere = this.whereForListScope(baseParts, deletedScope);

    if (preview) {
      const rows = await this.db.db
        .select({ id: patents.id, name: patents.name })
        .from(patents)
               .where(listWhere)
        .orderBy(desc(patents.createdAt), desc(patents.id))
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
        .orderBy(desc(patents.createdAt), desc(patents.id))
        .limit(limit)
        .offset(offset),
    ]);

    const total =
      deletedScope === 'active' ? tabActive : deletedScope === 'deleted' ? tabDeleted : tabAll;

    const patentIds = rows.map((row) => String(row.id));
    const [areaIdsMap, authorIdsMap, grantsPreviewByPatentId] = await Promise.all([
      this.getAreaIdsMap(patentIds),
      this.getAuthorIdsMap(patentIds),
      this.getPatentGrantsPreviewByPatentIds(patentIds),
    ]);
    const data = rows.map((patentRow) => {
      const patentId = String(patentRow.id);
      const basePayload = this.toResponse(
        patentRow,
        areaIdsMap[patentId] ?? [],
        authorIdsMap[patentId] ?? [],
      );
      const grantListPreview = grantsPreviewByPatentId[patentId];
      if (!grantListPreview) {
        return basePayload;
      }
      return {
        ...basePayload,
        patent_grants_count: grantListPreview.count,
        patent_grants_preview: grantListPreview.preview,
      };
    });

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
      transformed_into_patent_id: row.transformedIntoPatentId ? String(row.transformedIntoPatentId) : '',
      transformed_from_patent_id: row.transformedFromPatentId ? String(row.transformedFromPatentId) : '',
      transformation_notification_ic_zht: row.transformationNotificationIcZht ?? '',
      transformation_notification_cir: row.transformationNotificationCir ?? '',
    };
  }

  private async enrichPatentTransformationSnapshots(
    base: Record<string, unknown>,
    row: typeof patents.$inferSelect,
  ) {
    const intoId = row.transformedIntoPatentId ? String(row.transformedIntoPatentId) : '';
    const fromId = row.transformedFromPatentId ? String(row.transformedFromPatentId) : '';
    if (!intoId && !fromId) {
      return base;
    }
    const [intoRow, fromRow] = await Promise.all([
      intoId
        ? this.db.db
            .select({ registrationNumber: patents.registrationNumber })
            .from(patents)
            .where(eq(patents.id, intoId))
            .limit(1)
        : Promise.resolve([]),
      fromId
        ? this.db.db
            .select({ registrationNumber: patents.registrationNumber })
            .from(patents)
            .where(eq(patents.id, fromId))
            .limit(1)
        : Promise.resolve([]),
    ]);
    return {
      ...base,
      ...(intoId && intoRow[0]
        ? { transformation_target_registration_number: intoRow[0].registrationNumber ?? '' }
        : {}),
      ...(fromId && fromRow[0]
        ? { transformation_source_registration_number: fromRow[0].registrationNumber ?? '' }
        : {}),
    };
  }

  private async getPatentRow(id: string): Promise<(typeof patents.$inferSelect) | undefined> {
    const rows = await this.db.db.select().from(patents).where(eq(patents.id, id)).limit(1);
    return rows[0];
  }

  private async getPatentStatusName(statusId: string | null | undefined): Promise<string | undefined> {
    if (!statusId) return undefined;
    const rows = await this.db.db
      .select({ name: refPatentStatuses.name })
      .from(refPatentStatuses)
      .where(eq(refPatentStatuses.id, statusId))
      .limit(1);
    return rows[0]?.name ?? undefined;
  }

  private async validateTransformationTarget(targetId: string, sourceId: string): Promise<void> {
    if (targetId === sourceId) {
      throw new BadRequestException('Нельзя указать тот же РИД в качестве цели преобразования.');
    }
    const rows = await this.db.db
      .select({
        id: patents.id,
        isDeleted: patents.isDeleted,
        transformedFromPatentId: patents.transformedFromPatentId,
      })
      .from(patents)
      .where(eq(patents.id, targetId))
      .limit(1);
    const target = rows[0];
    if (!target) {
      throw new BadRequestException('Целевой РИД не найден.');
    }
    if (target.isDeleted) {
      throw new BadRequestException('Нельзя ссылаться на удалённый РИД.');
    }
    const from = target.transformedFromPatentId ? String(target.transformedFromPatentId) : '';
    if (from && from !== sourceId) {
      throw new ConflictException('Выбранный РИД уже указан как результат преобразования другого РИД.');
    }
  }

  async create(data: Record<string, unknown>) {
    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const departmentId = toUuid(data.department_id);
    if (!departmentId) throw new BadRequestException('department_id обязателен');
    const statusId = toUuid(data.status_id);
    const statusName = await this.getPatentStatusName(statusId);
    const isTransformation = isPatentRidTransformationStatusName(statusName);
    const intoId = toUuid(data.transformed_into_patent_id);
    const icZht =
      data.transformation_notification_ic_zht != null
        ? String(data.transformation_notification_ic_zht).trim()
        : '';
    const icCir =
      data.transformation_notification_cir != null
        ? String(data.transformation_notification_cir).trim()
        : '';

    if (isTransformation) {
      if (!intoId) {
        throw new BadRequestException('Укажите РИД, в который выполняется преобразование.');
      }
      if (!icZht) {
        throw new BadRequestException('Укажите номер уведомления ИЦ ЖТ.');
      }
      if (!icCir) {
        throw new BadRequestException('Укажите номер уведомления ЦИР.');
      }
      if (icZht.length > 255 || icCir.length > 255) {
        throw new BadRequestException('Номер уведомления не длиннее 255 символов.');
      }
    }

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
      statusId,
      responsibleForPatentId: toUuid(data.responsible_for_patenting_id),
      transformedIntoPatentId: isTransformation ? intoId : null,
      transformedFromPatentId: null,
      transformationNotificationIcZht: isTransformation ? icZht : null,
      transformationNotificationCir: isTransformation ? icCir : null,
    };

    const patentId = await this.db.db.transaction(async (tx) => {
      const [row] = await tx.insert(patents).values(insertData).returning();
      if (!row) {
        throw new BadRequestException('Не удалось создать патент');
      }
      const id = String(row.id);
      if (isTransformation && intoId) {
        await this.validateTransformationTarget(intoId, id);
        await tx
          .update(patents)
          .set({ transformedFromPatentId: id, updatedAt: new Date() })
          .where(eq(patents.id, intoId));
      }
      return id;
    });

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
    const currentRow = await this.getPatentRow(id);
    if (!currentRow) return null;

    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;

    const newStatusId =
      data.status_id !== undefined
        ? toUuid(data.status_id)
        : currentRow.statusId
          ? String(currentRow.statusId)
          : null;
    const oldStatusName = await this.getPatentStatusName(currentRow.statusId ? String(currentRow.statusId) : null);
    const newStatusName = await this.getPatentStatusName(newStatusId);
    const wasTransformation = isPatentRidTransformationStatusName(oldStatusName);
    const isTransformation = isPatentRidTransformationStatusName(newStatusName);

    let intoId: string | null = currentRow.transformedIntoPatentId
      ? String(currentRow.transformedIntoPatentId)
      : null;
    if (data.transformed_into_patent_id !== undefined) {
      intoId = toUuid(data.transformed_into_patent_id);
    }

    let icZht = currentRow.transformationNotificationIcZht ?? '';
    if (data.transformation_notification_ic_zht !== undefined) {
      icZht =
        data.transformation_notification_ic_zht == null || data.transformation_notification_ic_zht === ''
          ? ''
          : String(data.transformation_notification_ic_zht).trim();
    }
    let icCir = currentRow.transformationNotificationCir ?? '';
    if (data.transformation_notification_cir !== undefined) {
      icCir =
        data.transformation_notification_cir == null || data.transformation_notification_cir === ''
          ? ''
          : String(data.transformation_notification_cir).trim();
    }

    if (isTransformation) {
      if (!intoId) {
        throw new BadRequestException('Укажите РИД, в который выполняется преобразование.');
      }
      if (!icZht) {
        throw new BadRequestException('Укажите номер уведомления ИЦ ЖТ.');
      }
      if (!icCir) {
        throw new BadRequestException('Укажите номер уведомления ЦИР.');
      }
      if (icZht.length > 255 || icCir.length > 255) {
        throw new BadRequestException('Номер уведомления не длиннее 255 символов.');
      }
    }

    const oldIntoId = currentRow.transformedIntoPatentId ? String(currentRow.transformedIntoPatentId) : null;

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

    if (!isTransformation) {
      updateObj.transformedIntoPatentId = null;
      updateObj.transformationNotificationIcZht = null;
      updateObj.transformationNotificationCir = null;
    } else {
      updateObj.transformedIntoPatentId = intoId;
      updateObj.transformationNotificationIcZht = icZht;
      updateObj.transformationNotificationCir = icCir;
    }

    if (isTransformation && intoId) {
      await this.validateTransformationTarget(intoId, id);
    }

    await this.db.db.transaction(async (tx) => {
      if (wasTransformation && oldIntoId && (!isTransformation || oldIntoId !== intoId)) {
        await tx
          .update(patents)
          .set({ transformedFromPatentId: null, updatedAt: new Date() })
          .where(and(eq(patents.id, oldIntoId), eq(patents.transformedFromPatentId, id)));
      }

      await tx.update(patents).set(updateObj).where(eq(patents.id, id));

      if (isTransformation && intoId) {
        await tx
          .update(patents)
          .set({ transformedFromPatentId: id, updatedAt: new Date() })
          .where(eq(patents.id, intoId));
      }
    });

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
        .select({
          grant: patentGrants,
          patentName: patents.name,
          patentRegistrationNumber: patents.registrationNumber,
        })
        .from(patentGrants)
        .innerJoin(patents, eq(patentGrants.patentId, patents.id))
        .where(eq(patentGrants.patentId, patentId))
        .orderBy(asc(patentGrants.grantDate));
      return rows.map(({ grant: row, patentName, patentRegistrationNumber }) =>
        mapPatentGrantToApiDto(row, {
          name: patentName,
          registrationNumber: patentRegistrationNumber,
        }),
      );
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
